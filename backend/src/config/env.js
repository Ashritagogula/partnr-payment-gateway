module.exports = {
  TEST_MODE: process.env.TEST_MODE === 'true',
  TEST_PROCESSING_DELAY: Number(process.env.TEST_PROCESSING_DELAY || 1000),
  TEST_PAYMENT_SUCCESS:
    process.env.TEST_PAYMENT_SUCCESS === 'false' ? false : true
};
