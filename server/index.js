// server/index.js
// Entry point for the Express + Socket.io server.
//
// NON-DEVELOPER GUIDE:
//   • REST API  → handles tasks, projects, users, auth
//   • Socket.io → handles real-time team chat and live notifications
//   • Both run on the same port (3001) — no extra process needed

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const http       = require('http');
const path       = require('path');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const { Server } = require('socket.io');
const jwt        = require('jsonwebtoken');
const pool       = require('./db/pool');

const app    = express();
const server = http.createServer(app); // wrap Express in a plain HTTP server for Socket.io
const PORT   = process.env.PORT || 3001;

// ── Allowed origin — set APP_URL in .env for production ───────
const ALLOWED_ORIGIN = process.env.APP_URL || 'http://localhost:5173';

// ── Socket.io setup ───────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGIN, credentials: true },
});

// Make io accessible inside controllers via req.app.get('io')
app.set('io', io);

// ── Security headers (helmet) ─────────────────────────────────
app.use(helmet({
  // Allow loading images from same origin (avatars) + inline base64
  contentSecurityPolicy: false,
  // Allow the app to be embedded in an iframe on the same origin (optional)
  crossOriginEmbedderPolicy: false,
}));

// ── CORS ──────────────────────────────────────────────────────
app.use(cors({ origin: ALLOWED_ORIGIN, credentials: true }));
app.use(express.json());

// ── Rate limiter: login endpoint ──────────────────────────────
// 10 attempts per 15 minutes per IP — prevents brute-force attacks.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please wait 15 minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.post('/api/auth/login', loginLimiter);

// ── Static files — uploaded avatars ──────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ── REST Routes ───────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/projects',      require('./routes/projects'));
app.use('/api/tasks',         require('./routes/tasks'));
app.use('/api/notifications', require('./routes/notifications'));

// ── Auto-create chat_last_read table if it doesn't exist ─────
// Tracks the last message each user has seen — used for read receipts.
pool.query(`
  CREATE TABLE IF NOT EXISTS chat_last_read (
    user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    message_id INTEGER,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(err => console.error('chat_last_read table setup error:', err.message));

// ── REST: Chat history ────────────────────────────────────────
// Returns the last 50 messages + current read status for all users.
// Protected — requires a valid JWT token in the Authorization header.
const { requireAuth } = require('./middleware/auth');
app.get('/api/chat', requireAuth, async (req, res) => {
  try {
    const [msgResult, readResult] = await Promise.all([
      pool.query(
        `SELECT cm.id, cm.content, cm.created_at,
                u.id AS user_id, u.name, u.initials, u.avatar_url
         FROM chat_messages cm
         JOIN users u ON u.id = cm.user_id
         ORDER BY cm.created_at DESC
         LIMIT 50`
      ),
      pool.query(
        `SELECT clr.user_id, clr.message_id AS last_message_id, u.initials
         FROM chat_last_read clr
         JOIN users u ON u.id = clr.user_id`
      ),
    ]);
    res.json({
      messages:    msgResult.rows.reverse(),
      read_status: readResult.rows,
    });
  } catch (err) {
    console.error('GET /api/chat error:', err.message);
    res.status(500).json({ error: 'Failed to load messages.' });
  }
});

// ── Socket.io: real-time chat + notifications ─────────────────
// Each connecting client must send a valid JWT in the auth handshake.
// This lets us know who each socket belongs to without a separate login.
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required.'));
  try {
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Invalid token.'));
  }
});

// Track which users are currently connected.
// Map: userId (number) → Set of socketIds
// A user may have the app open in multiple tabs — only mark Offline when ALL tabs close.
const onlineUsers = new Map();

io.on('connection', (socket) => {
  const u = socket.user;
  console.log(`💬  Chat connected: ${u.name}`);

  // ── Presence: add this socket to the user's active set ──────
  if (!onlineUsers.has(u.id)) onlineUsers.set(u.id, new Set());
  onlineUsers.get(u.id).add(socket.id);
  io.emit('presence:update', [...onlineUsers.keys()]);

  // ── Send a chat message ──────────────────────────────────────
  // Client emits: { content: 'Hello team!' }
  // Server saves it, then broadcasts to everyone including sender
  socket.on('chat:send', async ({ content }) => {
    if (!content?.trim()) return;
    try {
      const result = await pool.query(
        `INSERT INTO chat_messages (user_id, content)
         VALUES ($1, $2)
         RETURNING id, content, created_at`,
        [u.id, content.trim()]
      );
      const msg = {
        ...result.rows[0],
        user_id:    u.id,
        name:       u.name,
        initials:   u.initials,
        avatar_url: u.avatar_url || null,
      };
      // Broadcast to ALL connected clients (including sender)
      io.emit('chat:message', msg);
    } catch (err) {
      console.error('chat:send error:', err.message);
    }
  });

  // ── Mark messages as read ────────────────────────────────────
  // Client emits { last_message_id } when it opens the chat or receives a new message.
  // Server upserts the user's read pointer and broadcasts the updated read list.
  socket.on('chat:read', async ({ last_message_id }) => {
    if (!last_message_id) return;
    try {
      await pool.query(
        `INSERT INTO chat_last_read (user_id, message_id, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id) DO UPDATE
           SET message_id = GREATEST(chat_last_read.message_id, $2),
               updated_at = NOW()`,
        [u.id, last_message_id]
      );
      const result = await pool.query(
        `SELECT clr.user_id, clr.message_id AS last_message_id, u.initials
         FROM chat_last_read clr
         JOIN users u ON u.id = clr.user_id`
      );
      io.emit('chat:read_status', result.rows);
    } catch (err) {
      console.error('chat:read error:', err.message);
    }
  });

  // ── Broadcast a notification to all OTHER users ──────────────
  // Called server-side when something happens (task assigned, etc.)
  // Client can also emit this to notify others of actions they took.
  socket.on('notify:broadcast', (payload) => {
    // payload: { title, body, icon }
    socket.broadcast.emit('notify:receive', payload);
  });

  socket.on('disconnect', () => {
    console.log(`💬  Chat disconnected: ${u.name}`);
    // ── Presence: remove this socket; mark Offline only if all tabs closed ──
    const sids = onlineUsers.get(u.id);
    if (sids) {
      sids.delete(socket.id);
      if (sids.size === 0) onlineUsers.delete(u.id);
    }
    io.emit('presence:update', [...onlineUsers.keys()]);
  });
});

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'TD Africa Task Manager API is running', timestamp: new Date().toISOString() });
});

// ── Production: serve the built React app ─────────────────────
// In production (NODE_ENV=production), Express serves the built
// frontend files from /dist so only one process is needed.
// In development, Vite's dev server runs separately on port 5173.
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  // Catch-all: send the React app for any non-API URL
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'app.html'));
  });
}

// ── 404 fallback (development / unknown API routes) ───────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('🔥 Unhandled error:', err.message);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

// ── Start ─────────────────────────────────────────────────────
// Use server.listen (not app.listen) so Socket.io works correctly
server.listen(PORT, () => {
  console.log(`🚀  Server running at http://localhost:${PORT}`);
  console.log(`💬  Socket.io ready for real-time chat`);
  console.log(`🩺  Health check: http://localhost:${PORT}/api/health`);
});
