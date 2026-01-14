const express = require('express');
const router = express.Router();
const webhookQueue = require('../queues/webhook.queue');

// 📡 Enqueue webhook event
router.post('/send', async (req, res) => {
  const { event, url, payload, secret } = req.body;

  await webhookQueue.add(
    {
      event,
      url,
      payload,
      secret
    },
    {
      attempts: 5,           // 🔁 max 5 retries
      backoff: {
        type: 'fixed',
        delay: 5000          // ⏱️ retry after 5 seconds
      }
    }
  );

  return res.status(202).json({
    message: 'Webhook queued'
  });
});

module.exports = router;
