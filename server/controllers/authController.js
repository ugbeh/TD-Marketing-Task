// controllers/authController.js
// Handles login, current-user fetch, forgot-password, and reset-password.

const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const crypto = require('crypto');   // built into Node — no install needed
const pool   = require('../db/pool');
const { sendEmail, buildEmailHtml } = require('../utils/email');

// ── POST /api/auth/login ──────────────────────────────────────
// Body: { email, password }
// Returns: { token, user }
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    const user = result.rows[0];

    if (!user) {
      // Same message for "wrong email" and "wrong password" — avoids leaking info
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const payload = {
      id:        user.id,
      email:     user.email,
      name:      user.name,
      initials:  user.initials,
      role:      user.role,
      job_title: user.job_title,
      status:    user.status,
      avatar_url: user.avatar_url,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    console.log(`🔑  Login: ${user.name} (${user.role})`);
    res.json({ token, user: payload });

  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Server error during login.' });
  }
}

// ── GET /api/auth/me ──────────────────────────────────────────
// Protected — returns fresh user data from the database.
async function getMe(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, initials, name, email, role, job_title, status, avatar_url, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user });

  } catch (err) {
    console.error('Get me error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
}

// ── POST /api/auth/forgot-password ───────────────────────────
// Body: { email }
//
// What happens:
//  1. Generates a one-time token that expires in 1 hour
//  2. Saves the token in the password_reset_tokens table
//  3. Logs the reset URL to the SERVER console — the admin can copy and
//     send it to the user (or set up SMTP in .env to email it automatically)
//
// Always returns the same response so we don't leak whether an email exists.
async function forgotPassword(req, res) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    // We respond with the same message whether the user exists or not
    // This prevents someone from figuring out which emails are registered
    if (!result.rows[0]) {
      return res.json({ message: 'ok' });
    }

    const user  = result.rows[0];
    const token = crypto.randomBytes(32).toString('hex'); // 64-char hex token
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Delete any old unused tokens for this user first
    await pool.query(
      'DELETE FROM password_reset_tokens WHERE user_id = $1',
      [user.id]
    );

    // Insert the new token
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    // Build the reset URL — the frontend reads the ?reset_token= query param
    const appUrl   = process.env.APP_URL || 'http://localhost:5173';
    const resetUrl = `${appUrl}?reset_token=${token}`;

    // Always log so an admin can manually share the link if email is not configured
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔑  PASSWORD RESET REQUESTED');
    console.log(`    User  : ${user.name}  (${user.email})`);
    console.log(`    Link  : ${resetUrl}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Send the reset link by email (non-fatal — console link still works as fallback)
    sendEmail({
      to:      user.email,
      subject: 'Reset your Task Manager password',
      text:    `Hi ${user.name},\n\nSomeone requested a password reset for your account.\n\nClick this link to set a new password (expires in 1 hour):\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
      html: buildEmailHtml({
        greeting:   `Hi ${user.name},`,
        intro:      'Someone requested a password reset for your TD Africa Data Team Task Manager account. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.',
        rows:       [],
        buttonText: 'Reset My Password',
        buttonUrl:  resetUrl,
      }),
    });

    res.json({ message: 'ok' });

  } catch (err) {
    console.error('forgotPassword error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
}

// ── POST /api/auth/reset-password ────────────────────────────
// Body: { token, password }
// Validates the token, updates the user's password, marks the token used.
async function resetPassword(req, res) {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Token and new password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    // Find a valid, unused, non-expired token
    const result = await pool.query(
      `SELECT prt.id, prt.user_id, u.name
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token = $1
         AND prt.used = false
         AND prt.expires_at > NOW()`,
      [token]
    );

    if (!result.rows[0]) {
      return res.status(400).json({
        error: 'This reset link is invalid or has already expired. Please request a new one.',
      });
    }

    const { id: tokenId, user_id, name } = result.rows[0];

    const hash = await bcrypt.hash(password, 10);

    // Update password and mark the token as used (can't reuse the same link)
    await Promise.all([
      pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, user_id]),
      pool.query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [tokenId]),
    ]);

    console.log(`✅  Password reset successful for ${name}`);
    res.json({ message: 'Password updated. You can now sign in with your new password.' });

  } catch (err) {
    console.error('resetPassword error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
}

// ── POST /api/auth/register ──────────────────────────────────
// Body: { name, email, password, job_title? }
// Public — creates a member account and returns a JWT so the user is
// immediately logged in without a second round-trip.
async function register(req, res) {
  const { name, email, password, job_title = '' } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    if (existing.rows[0]) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    // Auto-generate initials from first letters of each name word (max 2 chars)
    const base = name.trim().split(/\s+/).map(w => w[0].toUpperCase()).slice(0, 2).join('');
    let initials = base;
    let suffix = 2;
    // If another user already has those initials, append a number (e.g. JA2, JA3)
    while (true) {
      const clash = await pool.query('SELECT id FROM users WHERE initials = $1', [initials]);
      if (!clash.rows[0]) break;
      initials = base.slice(0, 1) + suffix++;
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (initials, name, email, password_hash, role, job_title, status)
       VALUES ($1, $2, $3, $4, 'member', $5, 'active')
       RETURNING id, initials, name, email, role, job_title, status, avatar_url`,
      [initials, name.trim(), email.toLowerCase().trim(), hash, job_title.trim()]
    );

    const user = result.rows[0];
    const payload = {
      id: user.id, email: user.email, name: user.name,
      initials: user.initials, role: user.role,
      job_title: user.job_title, status: user.status, avatar_url: user.avatar_url,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    console.log(`✅  New registration: ${user.name} (${user.initials})`);
    res.status(201).json({ token, user: payload });

  } catch (err) {
    console.error('register error:', err.message);
    res.status(500).json({ error: 'Server error during registration.' });
  }
}

// ── POST /api/auth/auto ──────────────────────────────────────
// No credentials needed — returns a 30-day JWT for the shared
// Marketing Team account so the dashboard opens without a login prompt.
// Individual team members can still sign in with personal credentials.
async function autoLogin(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name, email, initials, role, job_title, status, avatar_url
       FROM users WHERE initials = 'MT' LIMIT 1`
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Shared team account not configured.' });

    const payload = {
      id: user.id, email: user.email, name: user.name,
      initials: user.initials, role: user.role,
      job_title: user.job_title, status: user.status, avatar_url: user.avatar_url,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
    console.log('🌐  Auto-login: Marketing Team shared session');
    res.json({ token, user: payload });
  } catch (err) {
    console.error('Auto-login error:', err.message);
    res.status(500).json({ error: 'Server error.' });
  }
}

module.exports = { login, getMe, forgotPassword, resetPassword, autoLogin, register };
