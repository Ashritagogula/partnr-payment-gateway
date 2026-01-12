const express = require('express');
const app = express();

const paymentsRoutes = require('./routes/payments.routes');

app.use(express.json());

app.use('/api/v1/payments', paymentsRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'API running' });
});

module.exports = app;
