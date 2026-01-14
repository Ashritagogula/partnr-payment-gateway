const pool = require('../config/db');
const webhookQueue = require('../queues/webhook.queue');

module.exports = async function processRefundJob(refundId) {
  // 1️⃣ Fetch refund
  const refundResult = await pool.query(
    'SELECT * FROM refunds WHERE id = $1',
    [refundId]
  );

  if (refundResult.rowCount === 0) {
    throw new Error('Refund not found');
  }

  const refund = refundResult.rows[0];

  // 2️⃣ Fetch payment
  const paymentResult = await pool.query(
    'SELECT * FROM payments WHERE id = $1',
    [refund.payment_id]
  );

  if (paymentResult.rowCount === 0) {
    throw new Error('Payment not found');
  }

  const payment = paymentResult.rows[0];

  // 3️⃣ Mark refund as processed (NO updated_at)
  await pool.query(
    `UPDATE refunds
     SET status = 'processed'
     WHERE id = $1`,
    [refund.id]
  );

  // 4️⃣ If full refund → update payment status
  if (refund.amount === payment.amount) {
    await pool.query(
      `UPDATE payments
       SET status = 'refunded'
       WHERE id = $1`,
      [payment.id]
    );
  }

  // 5️⃣ Enqueue webhook event
  await webhookQueue.add({
    event: 'refund.processed',
    url: payment.webhook_url,
    payload: {
      refund_id: refund.id,
      payment_id: payment.id,
      amount: refund.amount,
      currency: payment.currency,
      status: 'processed'
    },
    secret: payment.webhook_secret
  });
};
