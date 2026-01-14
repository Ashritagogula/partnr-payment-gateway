const paymentQueue = require('./queues/payment.queue');
const refundQueue = require('./queues/refund.queue');

const processPaymentJob = require('./jobs/processPayment.job');
const processRefundJob = require('./jobs/processRefund.job');

console.log('👷 Worker started');

// =======================
// PAYMENT JOB CONSUMER
// =======================
paymentQueue.process(async (job) => {
  const { paymentId } = job.data;

  if (!paymentId) {
    throw new Error('Missing paymentId');
  }

  await processPaymentJob(paymentId);
});

// =======================
// REFUND JOB CONSUMER
// =======================
refundQueue.process(async (job) => {
  const { refundId } = job.data;

  if (!refundId) {
    throw new Error('Missing refundId');
  }

  console.log('🔄 Processing refund', refundId);

  await processRefundJob(refundId);
});
