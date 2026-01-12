const axios = require('axios');
const webhookQueue = require('../queues/webhook.queue');
const generateHmacSignature = require('../utils/hmac');
const retryIntervals = require('../config/webhookRetry');

console.log('📡 Webhook worker started');

webhookQueue.process(async (job) => {
  const {
    url,
    secret,
    payload,
    attempt = 0
  } = job.data;

  const payloadString = JSON.stringify(payload);
  const signature = generateHmacSignature(payloadString, secret);

  try {
    const response = await axios.post(url, payloadString, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature
      },
      timeout: 5000
    });

    console.log(`✅ Webhook delivered (${response.status})`);
    return true;

  } catch (error) {
    const nextAttempt = attempt + 1;

    if (nextAttempt >= retryIntervals.length) {
      console.log('❌ Webhook permanently failed');
      throw error;
    }

    const delay = retryIntervals[nextAttempt] * 1000;

    console.log(`🔁 Retrying webhook in ${delay / 1000}s`);

    await webhookQueue.add(
      {
        url,
        secret,
        payload,
        attempt: nextAttempt
      },
      { delay }
    );

    throw error;
  }
});
