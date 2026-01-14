const pool = require('../config/db');
const webhookQueue = require('../queues/webhook.queue');

/**
 * Process Payment Job
 * This runs asynchronously in worker
 */
module.exports = async function processPaymentJob(paymentId) {
  // 1️⃣ Fetch payment
  const result = await pool.query(
    'SELECT * FROM payments WHERE id = $1',
    [paymentId]
  );

  if (result.rowCount === 0) {
    throw new Error('Payment not found');
  }

  const payment = result.rows[0];

  // 2️⃣ Simulate processing delay
  let delayMs;

  if (process.env.TEST_MODE === 'true') {
    delayMs = Number(process.env.TEST_PROCESSING_DELAY || 1000);
  } else {
    // Random 5–10 seconds
    delayMs = Math.floor(Math.random() * 5000) + 5000;
  }

  await new Promise((resolve) => setTimeout(resolve, delayMs));

  // 3️⃣ Decide success or failure
  let success;

  if (process.env.TEST_MODE === 'true') {
    success = process.env.TEST_PAYMENT_SUCCESS !== 'false';
  } else {
    if (payment.method === 'upi') {
      success = Math.random() < 0.9; // 90%
    } else if (payment.method === 'card') {
      success = Math.random() < 0.95; // 95%
    } else {
      success = false;
    }
  }

  // 4️⃣ Update payment status
  if (success) {
    await pool.query(
      `UPDATE payments
       SET status = 'success',
           updated_at = NOW()
       WHERE id = $1`,
      [paymentId]
    );

    // 5️⃣ Enqueue success webhook
    await webhookQueue.add({
      event: 'payment.success',
      payload: {
        payment_id: payment.id,
        order_id: payment.order_id,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        status: 'success'
      },
      webhookUrl: payment.webhook_url,
      webhookSecret: payment.webhook_secret,
      attempt: 1
    });

  } else {
    await pool.query(
      `UPDATE payments
       SET status = 'failed',
           error_code = 'PAYMENT_FAILED',
           error_description = 'Payment could not be processed',
           updated_at = NOW()
       WHERE id = $1`,
      [paymentId]
    );

    // 6️⃣ Enqueue failure webhook
    await webhookQueue.add({
      event: 'payment.failed',
      payload: {
        payment_id: payment.id,
        order_id: payment.order_id,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        status: 'failed'
      },
      webhookUrl: payment.webhook_url,
      webhookSecret: payment.webhook_secret,
      attempt: 1
    });
  }
};
