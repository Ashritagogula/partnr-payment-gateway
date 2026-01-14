const paymentQueue = require('../queues/payment.queue');
const webhookQueue = require('../queues/webhook.queue');
const pool = require('../config/db');
const {
  TEST_MODE,
  TEST_PROCESSING_DELAY,
  TEST_PAYMENT_SUCCESS
} = require('../config/env');
const decidePaymentOutcome = require('../utils/paymentOutcome');

console.log('👷 Payment worker started');

paymentQueue.process(async (job) => {
  const { paymentId, method } = job.data;

  console.log(`🔄 Processing payment ${paymentId}`);

  // ⏳ Simulated delay
  if (TEST_MODE) {
    await new Promise((r) => setTimeout(r, TEST_PROCESSING_DELAY));
  } else {
    const delay = 5000 + Math.floor(Math.random() * 5000);
    await new Promise((r) => setTimeout(r, delay));
  }

  // ✅ Decide success / failure
  const success = TEST_MODE
    ? TEST_PAYMENT_SUCCESS
    : decidePaymentOutcome(method);

  const event = success ? 'payment.success' : 'payment.failed';

  console.log(
    success
      ? `✅ Payment SUCCESS: ${paymentId}`
      : `❌ Payment FAILED: ${paymentId}`
  );

  // 🔍 Fetch payment + merchant info
  const { rows } = await pool.query(
    `SELECT p.id, p.amount, p.currency, p.method, p.created_at,
            m.id AS merchant_id, m.webhook_url, m.webhook_secret
     FROM payments p
     JOIN merchants m ON p.merchant_id = m.id
     WHERE p.id = $1`,
    [paymentId]
  );

  if (!rows.length || !rows[0].webhook_url) {
    console.log('⚠️ No webhook configured, skipping delivery');
    return { paymentId, success };
  }

  const merchant = rows[0];

  // 📦 Webhook payload (task format)
  const payload = {
    event,
    timestamp: Math.floor(Date.now() / 1000),
    data: {
      payment: {
        id: paymentId,
        amount: merchant.amount,
        currency: merchant.currency,
        method: merchant.method,
        status: success ? 'success' : 'failed',
        created_at: merchant.created_at
      }
    }
  };

  // 📝 Create webhook log entry
  const logResult = await pool.query(
    `INSERT INTO webhook_logs
      (merchant_id, event, payload, status, attempts, created_at)
     VALUES ($1, $2, $3, 'pending', 0, NOW())
     RETURNING id`,
    [merchant.merchant_id, event, payload]
  );

  const webhookLogId = logResult.rows[0].id;

  // 📡 Enqueue webhook job
  await webhookQueue.add({
    webhookLogId,
    webhookUrl: merchant.webhook_url,
    webhookSecret: merchant.webhook_secret,
    payload,
    event,
    attempt: 0
  });

  return { paymentId, success };
});
