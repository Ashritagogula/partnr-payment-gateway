const db = require('../config/db');

const EXPIRY_HOURS = 24;

async function getCachedResponse(key) {
  const result = await db.query(
    `SELECT response FROM idempotency_keys
     WHERE key = $1 AND expires_at > now()`,
    [key]
  );

  return result.rows[0]?.response || null;
}

async function saveResponse(key, response) {
  await db.query(
    `INSERT INTO idempotency_keys (key, response, expires_at)
     VALUES ($1, $2, now() + interval '${EXPIRY_HOURS} hours')
     ON CONFLICT (key) DO NOTHING`,
    [key, response]
  );
}

module.exports = {
  getCachedResponse,
  saveResponse
};
