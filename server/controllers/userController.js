// controllers/userController.js
// User management — get, create (admin), update, assign role, delete.

const bcrypt = require('bcrypt');
const pool   = require('../db/pool');
const { sendEmail, buildEmailHtml } = require('../utils/email');

// ── GET /api/users ────────────────────────────────────────────
// Returns all users — used for dropdowns and the team view
async function getUsers(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, initials, name, email, role, job_title, status, avatar_url
       FROM users ORDER BY name ASC`
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error('getUsers error:', err.message);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
}

// ── GET /api/users/:id ────────────────────────────────────────
async function getUser(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, initials, name, email, role, job_title, status, avatar_url, created_at
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('getUser error:', err.message);
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
}

// ── POST /api/users  (admin only) ─────────────────────────────
// Admin creates a new team member account.
// Auto-generates initials from the name if not provided.
async function createUser(req, res) {
  const { name, email, password, job_title, role = 'member', initials } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    // Check email is not already taken
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows[0]) {
      return res.status(409).json({ error: 'A user with that email already exists.' });
    }

    // Auto-generate initials from first letters of name words (max 2 chars)
    const autoInitials = (initials || name.trim().split(/\s+/).map(w => w[0].toUpperCase()).slice(0, 2).join('')).toUpperCase();

    // Make sure initials are unique
    const existingInitials = await pool.query('SELECT id FROM users WHERE initials = $1', [autoInitials]);
    if (existingInitials.rows[0]) {
      return res.status(409).json({ error: `Initials "${autoInitials}" are already taken. Please provide custom initials.` });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (initials, name, email, password_hash, role, job_title)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, initials, name, email, role, job_title, status, avatar_url`,
      [autoInitials, name.trim(), email.toLowerCase().trim(), hash, role, job_title || null]
    );

    const newUser = result.rows[0];
    console.log(`👤  New user created by admin: ${newUser.name} (${newUser.role})`);
    res.status(201).json({ user: newUser });

    // Send a welcome email so the new member knows their login email address
    try {
      const appUrl = process.env.APP_URL || 'http://localhost:5173';
      sendEmail({
        to:      newUser.email,
        subject: 'Your TD Africa Data Team account is ready',
        text:    `Hi ${newUser.name},\n\n` +
                 `Your account has been created on the TD Africa Data Team Task Manager.\n\n` +
                 `Login email : ${newUser.email}\n` +
                 `Password    : the one your admin shared with you\n\n` +
                 `If you don't know your password, use "Forgot password?" on the login page to set your own.\n\n` +
                 `Open the app here: ${appUrl}`,
        html: buildEmailHtml({
          greeting:   `Hi ${newUser.name},`,
          intro:      `Your account has been created on the TD Africa Data Team Task Manager. Use the details below to sign in.`,
          rows: [
            ['Login email', `<strong>${newUser.email}</strong>`],
            ['Password',    'The one your admin shared with you. Use "Forgot password?" on the login page if you need to set your own.'],
          ],
          buttonText: 'Open Task Manager',
          buttonUrl:  appUrl,
        }),
      });
    } catch (emailErr) {
      console.error('createUser welcome email error (non-fatal):', emailErr.message);
    }

  } catch (err) {
    console.error('createUser error:', err.message);
    res.status(500).json({ error: 'Failed to create user.' });
  }
}

// ── PUT /api/users/:id ────────────────────────────────────────
// Update name, email, job_title, status, or password.
// Users can edit themselves; admins can edit anyone.
// Only admins can change another user's email.
async function updateUser(req, res) {
  const { id } = req.params;
  const { name, email, job_title, status, password } = req.body;

  if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
    return res.status(403).json({ error: 'You can only update your own profile.' });
  }

  try {
    // ── Email uniqueness check (if a new email was provided) ────
    if (email) {
      const clean = email.toLowerCase().trim();
      const taken = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [clean, id]
      );
      if (taken.rows[0]) {
        return res.status(409).json({ error: 'That email address is already in use.' });
      }
    }

    // ── Build the update — only overwrite fields that were sent ─
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await pool.query(
        `UPDATE users SET
           name          = COALESCE($1, name),
           email         = COALESCE($2, email),
           job_title     = COALESCE($3, job_title),
           status        = COALESCE($4, status),
           password_hash = $5
         WHERE id = $6`,
        [name, email ? email.toLowerCase().trim() : null, job_title, status, hash, id]
      );
    } else {
      await pool.query(
        `UPDATE users SET
           name      = COALESCE($1, name),
           email     = COALESCE($2, email),
           job_title = COALESCE($3, job_title),
           status    = COALESCE($4, status)
         WHERE id = $5`,
        [name, email ? email.toLowerCase().trim() : null, job_title, status, id]
      );
    }

    const result = await pool.query(
      'SELECT id, initials, name, email, role, job_title, status, avatar_url FROM users WHERE id = $1',
      [id]
    );
    res.json({ user: result.rows[0] });

  } catch (err) {
    console.error('updateUser error:', err.message);
    res.status(500).json({ error: 'Failed to update user.' });
  }
}

// ── PATCH /api/users/:id/role  (admin only) ───────────────────
// Promote a member to admin, or demote an admin to member.
async function updateUserRole(req, res) {
  const { id }   = req.params;
  const { role } = req.body;

  if (!['admin', 'member'].includes(role)) {
    return res.status(400).json({ error: 'Role must be "admin" or "member".' });
  }

  // Prevent admin from demoting themselves
  if (req.user.id === parseInt(id) && role === 'member') {
    return res.status(400).json({ error: 'You cannot remove your own admin rights.' });
  }

  try {
    const result = await pool.query(
      `UPDATE users SET role = $1 WHERE id = $2
       RETURNING id, initials, name, email, role, job_title`,
      [role, id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found.' });

    console.log(`🔐  Role updated: ${result.rows[0].name} → ${role}`);
    res.json({ user: result.rows[0] });

  } catch (err) {
    console.error('updateUserRole error:', err.message);
    res.status(500).json({ error: 'Failed to update role.' });
  }
}

// ── DELETE /api/users/:id  (admin only) ───────────────────────
async function deleteUser(req, res) {
  const { id } = req.params;

  if (req.user.id === parseInt(id)) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }

  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING name', [id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found.' });

    console.log(`🗑️   User deleted: ${result.rows[0].name}`);
    res.json({ message: `${result.rows[0].name} has been removed.` });

  } catch (err) {
    console.error('deleteUser error:', err.message);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
}

// ── PATCH /api/users/:id/avatar ───────────────────────────────
// Handles profile photo upload. Multer holds the file in memory;
// we convert it to a base64 data URL and store it in the database.
// This avoids any dependency on the filesystem (works on Render, etc.)
async function uploadAvatar(req, res) {
  const { id } = req.params;

  // Only the user themselves or an admin can change a profile photo
  if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
    return res.status(403).json({ error: 'You can only update your own photo.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No image file was received.' });
  }

  // Convert the in-memory buffer to a base64 data URL
  // e.g. "data:image/jpeg;base64,/9j/4AAQ..."
  const avatarUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

  try {
    await pool.query(
      'UPDATE users SET avatar_url = $1 WHERE id = $2',
      [avatarUrl, id]
    );
    console.log(`🖼️   Avatar updated for user ${id} (${req.file.size} bytes)`);
    res.json({ avatar_url: avatarUrl });
  } catch (err) {
    console.error('uploadAvatar error:', err.message);
    res.status(500).json({ error: 'Failed to save photo.' });
  }
}

module.exports = { getUsers, getUser, createUser, updateUser, updateUserRole, deleteUser, uploadAvatar };
