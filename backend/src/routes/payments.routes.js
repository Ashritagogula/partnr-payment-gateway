const express = require('express');
const router = express.Router();
const paymentQueue = require('../queues/payment.queue');

router.post('/', async (req, res) => {
  const { order_id, amount, method } = req.body;

  const payment = {
    id: `pay_${Date.now()}`,
    order_id,
    amount,
    method,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  await paymentQueue.add({
    paymentId: payment.id,
    method: payment.method
  });

  res.status(201).json(payment);
});

module.exports = router;
