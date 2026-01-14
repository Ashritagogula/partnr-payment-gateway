const db = require('../config/db');
const axios = require('axios');
const { generateHmac } = require('../utils/hmac');

module.exports = async function deliverWebhookJob(job) {
  const { event, url, payload, secret } = job.data;
  const attempt = job.attemptsMade + 1;

  let webhookLogId = job.data.webhookLogId;

  // 🆕 First attempt → insert log
  if (!webhookLogId) {
    const result = await db.query(
      `INSERT INTO webhook_logs (event, url, payload, status, attempt, next_retry_at)
       VALUES ($1, $2, $3, 'pending', $4, now() + interval '5 seconds')
       RETURNING id`,
      [event, url, payload, attempt]
    );

    webhookLogId = result.rows[0].id;
    job.data.webhookLogId = webhookLogId;
  } else {
    // 🔁 Retry → update attempt count
    await db.query(
      `UPDATE webhook_logs
       SET attempt = $1,
           next_retry_at = now() + interval '5 seconds',
           updated_at = now()
       WHERE id = $2`,
      [attempt, webhookLogId]
    );
  }

  try {
    const signature = generateHmac(payload, secret);

    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature
      },
      timeout: 5000
    });

    // ✅ Success
    await db.query(
      `UPDATE webhook_logs
       SET status = 'success',
           http_status = $1,
           response_body = $2,
           updated_at = now()
       WHERE id = $3`,
      [response.status, JSON.stringify(response.data), webhookLogId]
    );
  } catch (err) {
    // ❌ Failure
    await db.query(
      `UPDATE webhook_logs
       SET status = 'failed',
           response_body = $1,
           updated_at = now()
       WHERE id = $2`,
      [err.message, webhookLogId]
    );

    throw err; // let Bull retry
  }
};
