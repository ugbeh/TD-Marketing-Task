// db/pool.js
// Creates a single shared connection pool to PostgreSQL.
// Every route imports this instead of opening its own connection.
//
// In production (Neon / Railway): set DATABASE_URL in environment variables.
// In local development: set DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD in server/.env

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }, // required by Neon and most cloud Postgres providers
      }
    : {
        host:     process.env.DB_HOST,
        port:     process.env.DB_PORT,
        database: process.env.DB_NAME,
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      }
);

// Test the connection on startup and log the result
pool.connect((err, _client, release) => {
  if (err) {
    console.error('❌  Database connection failed:', err.message);
  } else {
    const dbName = process.env.DATABASE_URL ? 'Neon (cloud)' : process.env.DB_NAME;
    console.log('✅  Connected to PostgreSQL —', dbName);
    release();
  }
});

module.exports = pool;
