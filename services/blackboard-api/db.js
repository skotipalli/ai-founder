const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required (see README) — refusing to start without it');
}

const pool = new Pool({ connectionString: DATABASE_URL });

module.exports = { pool };
