const paymentQueue = require('../queues/payment.queue');

console.log('👷 Payment worker started');

paymentQueue.process(async (job) => {
  const { paymentId, method } = job.data;

  console.log(`Processing payment ${paymentId} (${method})`);

  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log(`Payment ${paymentId} processed`);
});
