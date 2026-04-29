// db/reset-passwords.js
// One-time script to set all seeded users' passwords to "password123"
// Run with:  node db/reset-passwords.js

require('dotenv').config();
const bcrypt = require('bcrypt');
const pool   = require('./pool');

async function resetPasswords() {
  const password    = 'password123';
  const hash        = await bcrypt.hash(password, 10);

  const result = await pool.query(
    'UPDATE users SET password_hash = $1 RETURNING name, email',
    [hash]
  );

  console.log(`\n✅  Updated ${result.rows.length} users:\n`);
  result.rows.forEach(u => console.log(`   • ${u.name} — ${u.email}`));
  console.log(`\n🔑  Password for all accounts: password123\n`);

  await pool.end();
}

resetPasswords().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
