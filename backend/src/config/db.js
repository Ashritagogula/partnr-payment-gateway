const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
  console.log('🗄️ Connected to PostgreSQL');
});

module.exports = pool;
