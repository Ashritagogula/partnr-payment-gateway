function decidePaymentOutcome(method) {
  const random = Math.random();

  if (method === 'upi') {
    return random < 0.9; // 90% success
  }

  if (method === 'card') {
    return random < 0.95; // 95% success
  }

  return false;
}

module.exports = decidePaymentOutcome;
