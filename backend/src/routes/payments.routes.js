const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const paymentQueue = require('../queues/payment.queue');
const crypto = require('crypto');

/**
 * POST /api/v1/payments
 */
router.post('/', async (req, res) => {
  try {
    /* ===============================
       1️⃣ Resolve merchant (SPEC)
    =============================== */
    const merchantResult = await pool.query(
      `SELECT id FROM merchants WHERE email = 'test@example.com'`
    );

    if (merchantResult.rowCount === 0) {
      return res.status(500).json({
        error: {
          code: 'MERCHANT_NOT_FOUND',
          description: 'Test merchant not found'
        }
      });
    }

    const merchantId = merchantResult.rows[0].id;

    /* ===============================
       2️⃣ Idempotency check (SCOPED)
    =============================== */
    const idemKey = req.header('Idempotency-Key');
    if (idemKey) {
      const cached = await pool.query(
        `SELECT response
         FROM idempotency_keys
         WHERE merchant_id = $1
           AND key = $2
           AND expires_at > NOW()`,
        [merchantId, idemKey]
      );

      if (cached.rowCount > 0) {
        return res.status(201).json(cached.rows[0].response);
      }
    }

    /* ===============================
       3️⃣ Validate input
    =============================== */
    const { order_id, amount, method, vpa } = req.body;
    if (!order_id || !amount || !method) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST_ERROR',
          description: 'Missing required fields'
        }
      });
    }

    /* ===============================
       4️⃣ Create payment
    =============================== */
    const paymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;

    await pool.query(
      `INSERT INTO payments
       (id, order_id, amount, currency, method, status, merchant_id, created_at, updated_at)
       VALUES ($1, $2, $3, 'INR', $4, 'pending', $5, NOW(), NOW())`,
      [
        paymentId,
        order_id,
        amount,
        method,
        merchantId
      ]
    );

    const payment = {
      id: paymentId,
      order_id,
      amount,
      currency: 'INR',
      method,
      vpa,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    /* ===============================
       5️⃣ Enqueue async job
    =============================== */
    await paymentQueue.add({
      paymentId,
      method
    });

    /* ===============================
       6️⃣ Store idempotency response
    =============================== */
    if (idemKey) {
      await pool.query(
        `INSERT INTO idempotency_keys
         (merchant_id, key, response, created_at, expires_at)
         VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '24 hours')
         ON CONFLICT (merchant_id, key)
         DO NOTHING`,
        [merchantId, idemKey, payment]
      );
    }

    return res.status(201).json(payment);
  } catch (err) {
    console.error('PAYMENT ROUTE ERROR:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        description: 'Something went wrong'
      }
    });
  }
});

module.exports = router;
