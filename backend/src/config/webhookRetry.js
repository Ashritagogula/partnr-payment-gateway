const isTest = process.env.WEBHOOK_RETRY_INTERVALS_TEST === 'true';

const PROD_INTERVALS = [0, 60, 300, 1800, 7200]; // seconds
const TEST_INTERVALS = [0, 5, 10, 15, 20];      // seconds

module.exports = isTest ? TEST_INTERVALS : PROD_INTERVALS;
