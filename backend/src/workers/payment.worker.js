const paymentQueue = require('../queues/payment.queue');
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
    await new Promise(r => setTimeout(r, TEST_PROCESSING_DELAY));
  } else {
    const delay = 5000 + Math.floor(Math.random() * 5000);
    await new Promise(r => setTimeout(r, delay));
  }

  // ✅ Decide success / failure
  const success = TEST_MODE
    ? TEST_PAYMENT_SUCCESS
    : decidePaymentOutcome(method);

  if (success) {
    console.log(`✅ Payment SUCCESS: ${paymentId}`);
  } else {
    console.log(`❌ Payment FAILED: ${paymentId}`);
  }

  return { paymentId, success };
});
