# CLAUDE.md — TD Africa Data Team Dashboard
## Complete project reference for AI-assisted development

This file gives any future Claude session full context about this project — what was built,
why decisions were made, and how to replicate or extend it. Read this before touching any code.

---

## What this app is

An internal task and project management dashboard for the **TD Africa Data Team**.
Replaces spreadsheets and WhatsApp threads with a single place to manage projects,
assign tasks, track progress, collaborate via comments, and chat as a team in real time.

**Live URL:** https://task-manager-jmdz.onrender.com  
**GitHub repo:** https://github.com/Gtoba1/Task-Manager  

**Team accounts (all @tdafrica.com emails):**
| Initials | Name | Role | Email |
|---|---|---|---|
| DT | Data Team | admin | datateam@tdafrica.com |
| SO | Samuel Oluwadamilola Oyeniran | member | samuel@tdafrica.com |
| TG | Oloruntoba Toluwalase Gabriel | member | toluwalase@tdafrica.com |
| SA | Sharon Oluwapelumi Adedeji | member | sharon@tdafrica.com |
| JA | Olusola John Abodunrin | member | john@tdafrica.com |
| DO | Deborah Ilashe Ogunmola | member | deborah@tdafrica.com |

**Brand colours:** Burgundy `#8B1A2B` (primary), Charcoal `#363435`, Gray `#848688`

---

## Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 18 + Vite | Single JSX file (`index.jsx`) + small files in `src/` |
| Styling | Inline styles only | No CSS files, no Tailwind — all styles are JS objects |
| Icons | lucide-react | |
| Charts | recharts | Used in the Analytics/Reports view |
| HTTP client | axios | Centralised in `src/api.js` |
| Real-time | socket.io-client | Chat + presence + desktop notifications |
| Backend | Express (Node.js) | CommonJS (`require`/`module.exports`) — NOT ES modules |
| Real-time server | socket.io | Runs on same port as Express via `http.createServer` |
| Auth | JWT (jsonwebtoken) | 7-day tokens stored in localStorage |
| Password hashing | bcrypt (cost 10) | Minimum 8 characters enforced on server + all forms |
| Database | PostgreSQL (Neon) | Cloud Postgres — `pg` pool with SSL |
| File uploads | multer (memoryStorage) | Avatar photos stored as base64 data URLs in DB — no filesystem |
| Security | helmet + express-rate-limit | Headers hardened; login limited to 10/15 min per IP |

---

## Project structure

```
Data Team Task Manager/
├── CLAUDE.md                   ← This file
├── .gitignore                  ← Excludes .env, node_modules, dist, uploads
├── .env.example                ← Safe template showing all required vars
├── render.yaml                 ← Render deployment config
├── package.json                ← Frontend deps (React, Vite, axios, socket.io-client, recharts)
├── vite.config.js              ← Dev proxy: /api → localhost:3001; input: app.html
├── app.html                    ← HTML entry point (NOT index.html — Vite configured for this)
├── main.jsx                    ← React root: Auth check → Login / App / ResetPasswordPage
├── index.jsx                   ← Main dashboard (~1900+ lines): all views, state, components
│
├── src/
│   ├── api.js                  ← All axios calls — single source of truth for backend comms
│   ├── AuthContext.jsx         ← useAuth() hook: login, logout, user state, JWT storage
│   ├── SocketContext.jsx       ← useSocket() hook + showDesktopNotification() helper
│   ├── Login.jsx               ← Login form + Forgot password form (two screens, one component)
│   └── ResetPasswordPage.jsx   ← Shown when URL has ?reset_token=xxx
│
└── server/
    ├── index.js                ← Express entry point: middleware, routes, Socket.io, static serving
    ├── .env                    ← Secrets — NEVER commit (gitignored)
    ├── .env.example            ← Safe template — commit this
    ├── package.json            ← Server deps (express, pg, bcrypt, jwt, multer, helmet, etc.)
    │
    ├── controllers/
    │   ├── authController.js       ← login, getMe, forgotPassword, resetPassword
    │   ├── userController.js       ← getUsers, createUser, updateUser, updateUserRole, deleteUser, uploadAvatar
    │   ├── taskController.js       ← CRUD tasks + status updates (logs activity on status change)
    │   ├── projectController.js    ← CRUD projects
    │   ├── commentController.js    ← getComments, addComment, deleteComment + logActivity() utility
    │   └── notificationController.js ← getNotifications, markAllRead
    │
    ├── routes/
    │   ├── auth.js             ← POST /login, GET /me, POST /forgot-password, POST /reset-password
    │   ├── users.js            ← GET+POST /, GET+PUT+DELETE /:id, PATCH /:id/role, PATCH /:id/avatar
    │   ├── tasks.js            ← CRUD /tasks + /:id/status + /:id/comments + /:id/comments/:cid
    │   ├── projects.js         ← CRUD /projects
    │   └── notifications.js    ← GET /, PATCH /read-all
    │
    ├── middleware/
    │   ├── auth.js             ← requireAuth + requireAdmin middleware (JWT Bearer token)
    │   └── upload.js           ← multer config: memoryStorage, images only, 3 MB max (★ mark)
    │
    └── db/
        ├── pool.js             ← Shared pg.Pool — uses DATABASE_URL (Neon) or individual DB_* vars
        ├── neon-setup.sql      ← Full schema + seed data — paste into Neon SQL Editor to set up
        ├── setup-admin.js      ← One-time local script (not used in cloud deployment)
        └── reset-passwords.js  ← Utility for manual password resets
```

---

## Database schema (Neon PostgreSQL)

The complete schema is in `server/db/neon-setup.sql`. Summary:

```sql
users              -- id, initials, name, email, password_hash, role, job_title, status, avatar_url
projects           -- id, name, type, status, progress, color, start_date, due_date, created_by
project_members    -- (project_id, user_id) join table
project_tags       -- id, project_id, tag
tasks              -- id, title, description, status, priority, dept, due_date, assignee_id, project_id, created_by
task_collaborators -- (task_id, user_id) join table
task_comments      -- id, task_id, user_id, content, created_at
task_activity      -- id, task_id, user_id, action, detail, created_at  (auto-logged on status change)
chat_messages      -- id, user_id, content, created_at
chat_last_read     -- user_id (PK), message_id, updated_at  ← AUTO-CREATED on server start (read receipts)
notifications      -- id, user_id, message, is_read, created_at
password_reset_tokens -- id, user_id, token, expires_at, used
```

**Important date format:** `due_date` in tasks and projects is stored as `VARCHAR` in free-form
format like `"Apr 5"` or `"May 30, 2025"`. The frontend parses it with a regex:
`str.match(/([A-Za-z]{3})\s+(\d{1,2})(?:,?\s*(\d{4}))?/)`. Do NOT change to `DATE` type
without updating all the parsing code throughout `index.jsx`.

**chat_last_read** is not in `neon-setup.sql` — it is auto-created by `server/index.js` on startup:
```js
pool.query(`CREATE TABLE IF NOT EXISTS chat_last_read (
  user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  message_id INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW()
)`);
```

---

## Environment variables (`server/.env`)

```
# PostgreSQL — Neon cloud (use DATABASE_URL) OR local (use individual vars)
DATABASE_URL=postgres://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# Only needed for local development (when DATABASE_URL is not set)
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=taskmanager
# DB_USER=postgres
# DB_PASSWORD=your_password

PORT=3001

# Your live domain — CORS and Socket.io are locked to this origin
APP_URL=https://task-manager-jmdz.onrender.com

# Generate: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET=your_96_char_hex_secret_here
JWT_EXPIRES_IN=7d

# Optional SMTP for automated password reset emails
# SMTP_HOST=smtp.office365.com
# SMTP_PORT=587
# SMTP_USER=datateam@tdafrica.com
# SMTP_PASS=your_email_password
# SMTP_FROM=TD Africa Data Team <datateam@tdafrica.com>
```

---

## Running locally (development)

**Prerequisites:** Node.js 18+, either Neon connection string or local PostgreSQL.

```bash
# Terminal 1 — backend
cd "Data Team Task Manager/server"
cp .env.example .env          # fill in your DB credentials + JWT_SECRET
npm install
npm run dev                   # nodemon starts on port 3001

# Terminal 2 — frontend
cd "Data Team Task Manager"
npm install
npm run dev                   # Vite starts on port 5173
```

Open `http://localhost:5173/app.html`

**First-time DB setup:** Open Neon (or your local psql) and run all of `server/db/neon-setup.sql`.
This creates all tables and seeds the team accounts with password `"password"`.
All team members should change their passwords after first login via Profile → Change my password.

---

## Deployment (Render + Neon — current setup)

**Render** hosts the Node.js server (free tier — sleeps after 15 min idle, wakes on first request).  
**Neon** hosts the PostgreSQL database (free tier — no expiry, always-on).

### render.yaml (already in repo)
```yaml
services:
  - type: web
    name: td-africa-data-team
    runtime: node
    buildCommand: npm install --include=dev && npm run build && npm install --prefix server
    startCommand: node server/index.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: NODE_VERSION
        value: 18.20.0
```

`--include=dev` in the build command is critical — Vite is a devDependency and must be installed
before `npm run build` runs. Without it the build fails with "vite: not found".

### Render env vars to set manually in dashboard
- `DATABASE_URL` — from Neon connection string
- `JWT_SECRET` — 96-char hex string
- `APP_URL` — `https://task-manager-jmdz.onrender.com`
- `NODE_ENV` — `production` (already in render.yaml)

### Production mode behaviour
When `NODE_ENV=production`, Express serves the built React app from `dist/` and sends `app.html`
for all non-API routes. Vite dev server is NOT used in production.

---

## Features

### Dashboard
- Summary stat cards: active projects, open tasks, completed tasks, team members
- Greeting: "Hi, [first name] 👋"
- Upcoming deadlines panel: real tasks sorted by due date, colour-coded (Overdue/Today/Tomorrow/In X days)
- Ongoing projects panel with progress bars
- All data is live from the API — nothing hardcoded

### Task Board (Kanban)
- Six columns: Backlog → In Progress → Review → Approved → Done
- Status changed via buttons in the task detail panel (right sidebar on click)
- Drag-and-drop between columns
- Task detail panel includes: metadata, comments, activity log (merged timeline)
- Dept tags: BU (Business Unit) or BG (Business Group)
- Priority dots: red (high), amber (medium), green (low)

### Projects
- Create, edit, delete projects
- Progress bar per project (0–100%)
- Members and tags per project
- Filter by status

### Team / Members
- Grid of member cards showing name, role, real online/offline status
- **Online/Offline is real-time** via Socket.io presence tracking — NOT the DB status field
- Edit member profile via modal (pencil button or clicking own avatar in sidebar)
- Upload profile photo — stored as **base64 data URL in the database** (not filesystem)
  - Max 3 MB (change `limits.fileSize` in `server/middleware/upload.js` line marked ★)
  - Accepted: JPEG, PNG, GIF, WebP
- Admin can promote/demote members and set their password
- Members can change their own password from Profile → "Change my password"

### Calendar
- Monthly view with task due dates plotted as coloured chips
- Navigate months with chevron arrows
- Today highlighted

### Timeline
- Gantt-style view of all projects across a 6-month window (1 month back, 5 months forward)
- Bar width and position calculated from start_date/due_date

### Reports / Analytics
- Charts: tasks by status (bar), tasks by project (bar), team workload (pie), pipeline summary

### Notifications (in-app bell)
- Live from API — no hardcoded data
- "Mark all read" clears the unread count
- Empty state when there are none

### Team Chat
- Team-wide channel (no DMs)
- Real-time via Socket.io
- Own messages right-aligned (burgundy), others left-aligned (gray)
- Date separators when day changes
- Loads last 50 messages on open
- Unread badge on sidebar when messages arrive while not on chat view
- **Read receipts:** "Seen" label + reader initials avatars appear under own messages once read
  - Powered by `chat_last_read` table (auto-created on server start)
  - Marks all messages as read automatically while chat view is open

### Desktop Notifications
- Browser Web Notifications API (permission requested once on first login)
- Fires on new chat messages when not in chat view, and on socket `notify:receive` events

### Admin Panel (admin role only)
- User management: create, promote/demote, delete members
- Set passwords for any member
- Overview stats

### Forgot Password
- Enter email → server logs a one-time reset link to the Terminal/Render logs
- Admin copies the link and sends to the user manually
- `?reset_token=xxx` in URL shows `ResetPasswordPage`
- Tokens: one-time, 1-hour expiry

---

## Socket.io events

| Event | Direction | Purpose |
|---|---|---|
| `chat:send` | client → server | Send a new chat message |
| `chat:message` | server → all clients | Broadcast a new message |
| `chat:read` | client → server | Signal last-seen message ID |
| `chat:read_status` | server → all clients | Broadcast updated read pointers |
| `presence:update` | server → all clients | Array of currently online user IDs |
| `notify:broadcast` | client → server | Ask server to notify other users |
| `notify:receive` | server → client | Trigger a desktop notification |

---

## Key architectural decisions & gotchas

### Single `index.jsx` file
All views, state, and components live in one file. Module-level mutable maps
(`MEMBER_NAMES`, `MEMBER_ROLES`, `AVATAR_URLS`) let every Avatar component instance
update without React state — mutate then trigger a re-render via local state.

### MemberModalForm defined inside App — KNOWN LIMITATION
`MemberModalForm` is declared as a `const` inside `App()`. On every App re-render, React
sees a NEW function reference and unmounts/remounts the modal, resetting all local form state.
**Workaround applied:** `handlePhotoChange` does NOT call `setRawUsers` after upload (which
would trigger an App re-render). It only mutates `AVATAR_URLS[key]` directly, then calls
`setUploading(false)` which only re-renders MemberModalForm, preserving form fields.
If this causes other issues in future, the proper fix is to move `MemberModalForm` outside `App`.

### Avatar storage — base64 in DB
Profile photos are stored as base64 data URLs (`data:image/jpeg;base64,...`) directly in
the `users.avatar_url` column. This works on Render's ephemeral filesystem and requires no
external storage service. At 3 MB max, a team of 6 uses at most ~24 MB in Neon — well within
the free 512 MB limit. To change the limit, edit the ★-marked line in `server/middleware/upload.js`.

### Presence tracking
`server/index.js` maintains `onlineUsers: Map<userId, Set<socketId>>`. A user is only marked
offline when ALL their browser tabs/windows disconnect. On each connect/disconnect, the server
emits `presence:update` with an array of currently-online user IDs. The frontend stores this
in `onlineUserIds: Set<number>` and uses it in TeamView to show real Online/Offline status.

### db/pool.js — dual config
```js
const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : { host, port, database, user, password }   // local dev
);
```
Neon requires SSL. Local dev skips SSL.

### CommonJS on the server
The server uses `require`/`module.exports` throughout. Do NOT add `"type": "module"` to
`server/package.json` or use `import`/`export` in server files.

---

## Security measures in place

- **JWT secret**: 96-char hex string in `.env`, never committed
- **Helmet**: HTTP security headers on every response
- **Rate limiting**: Login endpoint: 10 attempts / 15 min / IP
- **CORS**: Locked to `APP_URL` env var
- **Socket.io origin**: Also locked to `APP_URL`
- **Password minimum**: 8 characters, enforced server-side and on all client forms
- **SQL injection**: All queries use parameterised values (`$1`, `$2`, …)
- **Avatar uploads**: Only images, 3 MB max, stored as base64 (no path traversal risk)
- **Password reset tokens**: One-time, 1-hour expiry, old tokens deleted on new request
- **`.gitignore`**: `.env`, `node_modules/`, `dist/`, `server/public/uploads/` excluded

---

## Replicating for another department (Marketing, Sales, Procurement, etc.)

### Step 1 — Fork the repo
Create a new GitHub repo, copy this codebase in.

### Step 2 — Branding (5 minutes)
In `index.jsx` at the top of the file, in the "EASY CUSTOMISATION" section:
```js
const BRAND = {
  company:  'TD Africa',
  subtitle: 'Marketing Team',   // ← change this
  logo:     '/img/logo-white.png',
};
const COLORS = {
  burg: '#1A4D8B',   // ← change primary colour to e.g. blue for marketing
  ...
};
```
In `src/Login.jsx` update the team name in the left panel.

### Step 3 — New Neon database
Create a new Neon project. Open the SQL Editor and paste `server/db/neon-setup.sql`.
Edit the seed `INSERT INTO users` block with the new team's names/emails/initials.

### Step 4 — New Render service
Create a new Render Web Service pointing to the new repo.
Set env vars: `DATABASE_URL`, `JWT_SECRET`, `APP_URL`, `NODE_ENV=production`.

### Step 5 — Update MEMBER_COLORS in index.jsx
```js
const MEMBER_COLORS = {
  AB: { bg: '#E8EFF9', fg: '#3A6FD8' },  // one entry per team member initials
  // ...
};
```

### What you do NOT need to change
All business logic (tasks, projects, comments, chat, notifications, auth, admin panel)
is fully generic. The Admin Panel UI lets you add/remove members without touching code.

---

## Build history (sessions)

- **Session 1 (Apr 2025):** Initial build — full app from scratch; all views, API, auth, DB schema
- **Session 2 (Apr 2025):** Security hardening (helmet, rate-limit, CORS from env, .gitignore,
  8-char passwords, production build config); deployment to Render + Neon; cleaned all hardcoded
  demo data (Calendar, Timeline, Dashboard, Notifications now live from API); member password change
  from profile modal
- **Session 3 (Apr 2025):** Real online/offline presence tracking; sidebar Profile button; greeting
  "Good morning" → "Hi"; chat read receipts (Seen + reader avatars); avatar upload fix (base64 in DB);
  fixed password change silently dropped in saveMember; fixed Save Changes resetting after photo upload
