// server/db/setup-admin.js
// ─────────────────────────────────────────────────────────────
// Run this ONCE from the /server folder to:
//   1. Create the Data Team admin account  (datateam@tdafrica.com)
//   2. Demote Samuel (SO) to a regular member
//   3. Create the password_reset_tokens table (used for "Forgot password")
//
// HOW TO RUN:
//   Open a terminal in C:\Users\gabri\Documents\Data Team Task Manager\server
//   Then type:  node db/setup-admin.js
// ─────────────────────────────────────────────────────────────

require('dotenv').config();
const bcrypt = require('bcrypt');
const pool   = require('./pool');

async function run() {
  console.log('── Data Team Admin Setup ─────────────────────────\n');

  try {
    // ── Step 1: Create the password_reset_tokens table ─────────
    // This table is used by the "Forgot password?" feature on the login page.
    // Each row stores a one-time token that expires after 1 hour.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token      VARCHAR(64) NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used       BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✅  password_reset_tokens table ready');

    // ── Step 2: Create the Data Team admin account ──────────────
    const hash = await bcrypt.hash('password123', 10);

    const existing = await pool.query(
      "SELECT id FROM users WHERE email = 'datateam@tdafrica.com'"
    );

    if (existing.rows[0]) {
      console.log('ℹ️   Data Team admin already exists — skipping');
    } else {
      // Check initials DT are free
      const initCheck = await pool.query(
        "SELECT id FROM users WHERE initials = 'DT'"
      );
      if (initCheck.rows[0]) {
        console.log('⚠️   Initials "DT" already taken — skipping Data Team account creation');
      } else {
        await pool.query(
          `INSERT INTO users (initials, name, email, password_hash, role, job_title)
           VALUES ('DT', 'Data Team', 'datateam@tdafrica.com', $1, 'admin', 'Administrator')`,
          [hash]
        );
        console.log('✅  Data Team admin created → datateam@tdafrica.com / password123');
      }
    }

    // ── Step 3: Demote Samuel (SO) from admin → member ──────────
    const samuel = await pool.query(
      "SELECT id, name, role FROM users WHERE initials = 'SO'"
    );

    if (!samuel.rows[0]) {
      console.log('ℹ️   No user with initials SO found — skipping demotion');
    } else if (samuel.rows[0].role === 'member') {
      console.log(`ℹ️   ${samuel.rows[0].name} is already a member — no change`);
    } else {
      await pool.query("UPDATE users SET role = 'member' WHERE initials = 'SO'");
      console.log(`✅  ${samuel.rows[0].name} is now a regular member`);
    }

    console.log('\n── All done! ─────────────────────────────────────');
    console.log('   Admin login → datateam@tdafrica.com / password123');
    console.log('   Change the password after first login via Admin Panel → 🔑 Reset Password\n');

  } catch (err) {
    console.error('❌  Setup failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
