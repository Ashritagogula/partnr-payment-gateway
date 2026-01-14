const Queue = require('bull');

const refundQueue = new Queue(
  'refund-queue',
  process.env.REDIS_URL
);

module.exports = refundQueue;
