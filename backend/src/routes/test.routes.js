const express = require('express');
const router = express.Router();

/**
 * DEBUG VERSION — MUST RESPOND IMMEDIATELY
 */
router.get('/jobs/status', (req, res) => {
  res.json({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    worker_status: 'running'
  });
});

module.exports = router;
