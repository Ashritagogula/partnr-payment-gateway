const express = require('express');
const app = express();

app.use(express.json());

app.post('/webhook', (req, res) => {
  console.log('✅ Webhook received');
  console.log('Event:', req.body.event);
  res.sendStatus(200);
});

app.listen(4000, () => {
  console.log('🚀 Webhook receiver running on port 4000');
});
