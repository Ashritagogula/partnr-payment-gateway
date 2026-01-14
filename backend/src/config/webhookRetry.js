const isTest = process.env.WEBHOOK_RETRY_INTERVALS_TEST === 'true';

// Retry intervals in seconds
const PROD_INTERVALS = [0, 60, 300, 1800, 7200]; // immediate, 1m, 5m, 30m, 2h
const TEST_INTERVALS = [0, 5, 10, 15, 20];       // fast retries for evaluation

const INTERVALS = isTest ? TEST_INTERVALS : PROD_INTERVALS;

/**
 * Get next retry delay based on attempt count
 * attempt = 1 → immediate
 * attempt = 2 → next interval
 * ...
 * attempt >= 5 → stop retrying
 */
function getRetryDelay(attempt) {
  if (attempt < 1 || attempt > INTERVALS.length) {
    return null; // stop retrying
  }

  return INTERVALS[attempt - 1] * 1000; // convert to ms
}

module.exports = {
  getRetryDelay,
  MAX_ATTEMPTS: INTERVALS.length
};
