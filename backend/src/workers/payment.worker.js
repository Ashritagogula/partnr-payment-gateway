const paymentQueue = require('../queues/payment.queue');

console.log(' Payment worker started');

paymentQueue.process(async (job) => {
  console.log(' Processing job:', job.id);
  await new Promise(r => setTimeout(r, 2000));
  console.log(' Job done:', job.id);
});
