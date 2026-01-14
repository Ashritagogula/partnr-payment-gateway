const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);

  const expected = crypto
    .createHmac('sha256', 'whsec_test_abc123')
    .update(payload)
    .digest('hex');

  console.log('--- WEBHOOK RECEIVED ---');
  console.log('Event:', req.body.event);
  console.log('Signature OK:', signature === expected);

  res.status(200).send('OK');
});

app.listen(4000, () => {
  console.log('✅ Test webhook listening on port 4000');
});
