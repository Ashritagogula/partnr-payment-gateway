const paymentQueue = require('../queues/payment.queue');
const webhookQueue = require('../queues/webhook.queue');
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

  // ⏳ Simulated processing delay
  if (TEST_MODE) {
    await new Promise(r => setTimeout(r, TEST_PROCESSING_DELAY));
  } else {
    const delay = 5000 + Math.floor(Math.random() * 5000);
    await new Promise(r => setTimeout(r, delay));
  }

  // ✅ Decide success / failure
  const success = TEST_MODE
    ? TEST_PAYMENT_SUCCESS
    : decidePaymentOutcome(method);

  const event = success ? 'payment.success' : 'payment.failed';

  if (success) {
    console.log(`✅ Payment SUCCESS: ${paymentId}`);
  } else {
    console.log(`❌ Payment FAILED: ${paymentId}`);
  }

  // 📡 Enqueue webhook delivery job
  await webhookQueue.add({
    url: 'http://host.docker.internal:4000/webhook',
    secret: 'whsec_test_abc123',
    payload: {
      event,
      timestamp: Math.floor(Date.now() / 1000),
      data: {
        payment: {
          id: paymentId,
          method,
          status: success ? 'success' : 'failed'
        }
      }
    }
  });

  return { paymentId, success };
});
