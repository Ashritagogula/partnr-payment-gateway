const crypto = require('crypto');

function generateHmacSignature(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

module.exports = generateHmacSignature;
