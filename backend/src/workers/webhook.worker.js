const axios = require('axios');
const webhookQueue = require('../queues/webhook.queue');
const generateHmacSignature = require('../utils/hmac');
const pool = require('../config/db');
const { getRetryDelay, MAX_ATTEMPTS } = require('../config/webhookRetry');

console.log('📡 Webhook worker started');

webhookQueue.process(async (job) => {
  const {
    webhookLogId,
    webhookUrl,
    webhookSecret,
    payload,
    event,
    attempt = 1
  } = job.data;

  const payloadString = JSON.stringify(payload);
  const signature = generateHmacSignature(payloadString, webhookSecret);

  try {
    const response = await axios.post(webhookUrl, payloadString, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature
      },
      timeout: 5000
    });

    // ✅ Success
    await pool.query(
      `UPDATE webhook_logs
       SET status = 'success',
           attempts = $1,
           last_attempt_at = NOW(),
           response_code = $2
       WHERE id = $3`,
      [attempt, response.status, webhookLogId]
    );

    console.log(`✅ Webhook delivered: ${event}`);
    return true;

  } catch (err) {
    const nextAttempt = attempt + 1;
    const delay = getRetryDelay(nextAttempt);

    // ❌ Stop retrying after MAX_ATTEMPTS
    if (delay === null) {
      await pool.query(
        `UPDATE webhook_logs
         SET status = 'failed',
             attempts = $1,
             last_attempt_at = NOW(),
             response_code = $2,
             response_body = $3
         WHERE id = $4`,
        [
          attempt,
          err.response?.status || 500,
          err.message,
          webhookLogId
        ]
      );

      console.log(`❌ Webhook permanently failed: ${event}`);
      return;
    }

    // 🔁 Schedule retry
    const nextRetryAt = new Date(Date.now() + delay);

    await pool.query(
      `UPDATE webhook_logs
       SET status = 'pending',
           attempts = $1,
           last_attempt_at = NOW(),
           next_retry_at = $2,
           response_code = $3,
           response_body = $4
       WHERE id = $5`,
      [
        attempt,
        nextRetryAt,
        err.response?.status || 500,
        err.message,
        webhookLogId
      ]
    );

    await webhookQueue.add(
      {
        webhookLogId,
        webhookUrl,
        webhookSecret,
        payload,
        event,
        attempt: nextAttempt
      },
      { delay }
    );

    console.log(
      `🔁 Webhook retry scheduled (attempt ${nextAttempt}/${MAX_ATTEMPTS})`
    );
  }
});
