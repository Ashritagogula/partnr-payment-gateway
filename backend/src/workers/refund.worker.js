const refundQueue = require('../queues/refund.queue');
const webhookQueue = require('../queues/webhook.queue');
const pool = require('../config/db');

console.log('👷 Refund worker started');

refundQueue.process(async (job) => {
  const { refundId } = job.data;

  console.log(`🔄 Processing refund ${refundId}`);

  // ⏳ Simulate refund processing delay (3–5 seconds)
  const delay = 3000 + Math.floor(Math.random() * 2000);
  await new Promise((r) => setTimeout(r, delay));

  // 🔍 Fetch refund + payment + merchant info
  const { rows } = await pool.query(
    `SELECT r.id, r.amount, r.reason, r.created_at,
            p.id AS payment_id, p.amount AS payment_amount, p.currency,
            m.id AS merchant_id, m.webhook_url, m.webhook_secret
     FROM refunds r
     JOIN payments p ON r.payment_id = p.id
     JOIN merchants m ON r.merchant_id = m.id
     WHERE r.id = $1`,
    [refundId]
  );

  if (!rows.length) {
    console.log('❌ Refund not found');
    return;
  }

  const refund = rows[0];

  // ✅ Update refund status
  await pool.query(
    `UPDATE refunds
     SET status = 'processed',
         processed_at = NOW()
     WHERE id = $1`,
    [refundId]
  );

  console.log(`✅ Refund processed: ${refundId}`);

  // 🚫 If merchant has no webhook configured, skip webhook
  if (!refund.webhook_url) {
    console.log('⚠️ No webhook configured, skipping refund webhook');
    return { refundId };
  }

  const event = 'refund.processed';

  // 📦 Webhook payload (task format)
  const payload = {
    event,
    timestamp: Math.floor(Date.now() / 1000),
    data: {
      refund: {
        id: refund.id,
        payment_id: refund.payment_id,
        amount: refund.amount,
        currency: refund.currency,
        reason: refund.reason,
        status: 'processed',
        created_at: refund.created_at,
        processed_at: new Date().toISOString()
      }
    }
  };

  // 📝 Create webhook log entry
  const logResult = await pool.query(
    `INSERT INTO webhook_logs
      (merchant_id, event, payload, status, attempts, created_at)
     VALUES ($1, $2, $3, 'pending', 0, NOW())
     RETURNING id`,
    [refund.merchant_id, event, payload]
  );

  const webhookLogId = logResult.rows[0].id;

  // 📡 Enqueue webhook delivery job
  await webhookQueue.add({
    webhookLogId,
    webhookUrl: refund.webhook_url,
    webhookSecret: refund.webhook_secret,
    payload,
    event,
    attempt: 0
  });

  console.log(`📡 Refund webhook enqueued: ${refundId}`);

  return { refundId };
});
