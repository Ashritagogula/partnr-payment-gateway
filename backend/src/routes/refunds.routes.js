const express = require('express');
const pool = require('../config/db');
const enqueueRefundJob = require('../jobs/processRefund.job');
const crypto = require('crypto');

const router = express.Router();

/**
 * POST /api/v1/payments/:paymentId/refunds
 */
router.post('/:paymentId/refunds', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, reason } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          description: 'Refund amount must be greater than zero'
        }
      });
    }

    // 1️⃣ Fetch payment
    const paymentResult = await pool.query(
      'SELECT * FROM payments WHERE id = $1',
      [paymentId]
    );

    if (paymentResult.rowCount === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          description: 'Payment not found'
        }
      });
    }

    const payment = paymentResult.rows[0];

    // ✅ FIX 1: Allow refund ONLY after success
    if (payment.status !== 'success') {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          description: 'Payment not refundable'
        }
      });
    }

    // 2️⃣ Calculate refunded amount so far
    const refundSumResult = await pool.query(
  `SELECT COALESCE(SUM(amount), 0) AS refunded
   FROM refunds
   WHERE payment_id = $1
   AND status IN ('pending', 'processed')`,
  [paymentId]
);


    const refundedSoFar = Number(refundSumResult.rows[0].refunded);

    if (refundedSoFar + amount > payment.amount) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          description: 'Refund amount exceeds payment amount'
        }
      });
    }

    // 3️⃣ Generate refund ID (spec-compliant)
    const refundId = `rfnd_${crypto.randomBytes(8).toString('hex')}`;

    // 4️⃣ Insert refund — MATCHES SCHEMA EXACTLY
    const refundResult = await pool.query(
      `INSERT INTO refunds
       (id, payment_id, merchant_id, amount, reason, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
       RETURNING id, created_at`,
      [
        refundId,
        payment.id,
        payment.merchant_id,
        amount,
        reason || null
      ]
    );

    const refund = refundResult.rows[0];

    // 5️⃣ Enqueue refund job
    await enqueueRefundJob(refund.id);

    return res.status(201).json({
      id: refund.id,
      payment_id: paymentId,
      amount,
      status: 'pending',
      created_at: refund.created_at
    });

  } catch (err) {
    console.error('Refund error:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        description: 'Unable to process refund'
      }
    });
  }
});

/**
 * GET /api/v1/refunds/:refundId
 */
router.get('/:refundId', async (req, res) => {

  try {
    const { refundId } = req.params;

    const result = await pool.query(
      `SELECT id,
              payment_id,
              amount,
              reason,
              status,
              created_at,
              created_at AS processed_at
       FROM refunds
       WHERE id = $1`,
      [refundId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          description: 'Refund not found'
        }
      });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Get refund error:', err);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        description: 'Unable to fetch refund'
      }
    });
  }
});


module.exports = router;
