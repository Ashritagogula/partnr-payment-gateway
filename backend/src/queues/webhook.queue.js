const Queue = require('bull');
const deliverWebhookJob = require('../jobs/deliverWebhook.job');

const webhookQueue = new Queue('webhooks', process.env.REDIS_URL);

// 🔗 Connect queue to processor
webhookQueue.process(deliverWebhookJob);

module.exports = webhookQueue;
