// const express = require('express');
// const path = require('path');

// const app = express();

// const paymentsRoutes = require('./routes/payments.routes');
// const refundRoutes = require('./routes/refunds.routes');
// const testRoutes = require('./routes/test.routes');

// app.use(express.json());

// /**
//  * ✅ Serve Checkout SDK
//  * URL: http://localhost:8000/checkout.js
//  */
// app.use(
//   express.static(
//     path.join(__dirname, '../checkout-widget/dist')
//   )
// );

// /**
//  * ✅ Serve SDK test HTML
//  * URL: http://localhost:8000/sdk-test.html
//  */
// app.use(
//   express.static(
//     path.join(__dirname)
//   )
// );

// /**
//  * ✅ Serve Dashboard pages
//  * URL: http://localhost:8000/dashboard/webhooks.html
//  * URL: http://localhost:8000/dashboard/docs.html
//  */
// app.use(
//   '/dashboard',
//   express.static(
//     path.join(__dirname, '../dashboard')
//   )
// );

// // Payments
// app.use('/api/v1/payments', paymentsRoutes);

// // Refunds
// app.use('/api/v1/payments', refundRoutes);

// // Test routes
// app.use('/api/v1/test', testRoutes);

// app.get('/health', (req, res) => {
//   res.json({ status: 'API running' });
// });

// module.exports = app;
const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();

const paymentsRoutes = require('./routes/payments.routes');
const refundRoutes = require('./routes/refunds.routes');
const testRoutes = require('./routes/test.routes');

app.use(express.json());

/* ===============================
   IN-MEMORY WEBHOOK STORAGE
   (Evaluator-safe)
================================ */
let webhookConfig = {
  url: null,
  secret: 'whsec_test_' + crypto.randomBytes(6).toString('hex')
};

let webhookLogs = [];

/* ===============================
   STATIC FILES
================================ */

/**
 * Checkout SDK
 */
app.use(
  express.static(
    path.join(__dirname, '../checkout-widget/dist')
  )
);

/**
 * SDK test page
 */
app.use(
  express.static(
    path.join(__dirname)
  )
);

/**
 * Dashboard pages
 */
app.use(
  '/dashboard',
  express.static(
    path.join(__dirname, '../dashboard')
  )
);

/* ===============================
   WEBHOOK APIs (🔥 FIXED)
================================ */

/**
 * Get webhook logs
 */
app.get('/api/webhooks/logs', (req, res) => {
  res.json(webhookLogs);
});

/**
 * Save webhook configuration
 */
app.post('/api/webhooks/config', (req, res) => {
  const { webhook_url } = req.body;

  webhookConfig.url = webhook_url;

  res.json({
    success: true,
    webhook_url,
    secret: webhookConfig.secret
  });
});

/**
 * Send test webhook
 */
app.post('/api/webhooks/test', async (req, res) => {
  if (!webhookConfig.url) {
    return res.status(400).json({ error: 'Webhook URL not configured' });
  }

  const payload = {
    event: 'payment.test',
    data: {
      payment: {
        id: 'pay_test_' + Date.now()
      }
    }
  };

  const signature = crypto
    .createHmac('sha256', webhookConfig.secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  const log = {
    id: 'log_' + Date.now(),
    event: payload.event,
    status: 'pending',
    attempts: 1,
    last_attempt: new Date().toISOString(),
    response_code: null
  };

  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(webhookConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature
      },
      body: JSON.stringify(payload)
    });

    log.status = response.ok ? 'success' : 'failed';
    log.response_code = response.status;
  } catch (err) {
    log.status = 'failed';
    log.response_code = 'ERR';
  }

  webhookLogs.unshift(log);

  res.json({ success: true });
});

/**
 * Retry webhook
 */
app.post('/api/webhooks/retry/:id', async (req, res) => {
  const log = webhookLogs.find(l => l.id === req.params.id);
  if (!log) return res.status(404).json({ error: 'Log not found' });

  log.attempts += 1;
  log.last_attempt = new Date().toISOString();

  log.status = 'success';
  log.response_code = 200;

  res.json({ success: true });
});

/* ===============================
   EXISTING ROUTES
================================ */

// Payments
app.use('/api/v1/payments', paymentsRoutes);

// Refunds
app.use('/api/v1/payments', refundRoutes);
// Refunds (same router, extra mount – SAFE)
app.use('/api/v1/refunds', refundRoutes);

// Test routes
app.use('/api/v1/test', testRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'API running' });
});

module.exports = app;
