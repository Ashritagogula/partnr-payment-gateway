const Queue = require('bull');

const paymentQueue = new Queue(
  'payment-queue',
  process.env.REDIS_URL
);

module.exports = paymentQueue;
