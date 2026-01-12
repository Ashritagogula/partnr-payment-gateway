const Queue = require('bull');

const webhookQueue = new Queue('webhooks', process.env.REDIS_URL);

module.exports = webhookQueue;
