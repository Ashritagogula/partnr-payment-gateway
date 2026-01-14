BEGIN;

-- ===============================
-- 1️⃣ MERCHANTS TABLE (REQUIRED)
-- ===============================
CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    webhook_url TEXT,
    webhook_secret VARCHAR(64)
);

-- Insert test merchant (required by spec)
INSERT INTO merchants (id, email, webhook_url, webhook_secret)
VALUES (
    gen_random_uuid(),
    'test@example.com',
    'http://host.docker.internal:4000/webhook',
    'whsec_test_abc123'
)
ON CONFLICT (email) DO NOTHING;

-- ===============================
-- 2️⃣ PAYMENTS TABLE
-- ===============================
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(100) NOT NULL,
    amount INTEGER NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    method VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL,
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ===============================
-- 3️⃣ REFUNDS TABLE (SPEC-COMPLIANT)
-- ===============================
CREATE TABLE IF NOT EXISTS refunds (
    id VARCHAR(64) PRIMARY KEY,                     -- rfnd_ + 16 chars
    payment_id VARCHAR(64) NOT NULL REFERENCES payments(id),
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    amount INTEGER NOT NULL,
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | processed
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    processed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refunds_payment_id
ON refunds(payment_id);

-- ===============================
-- 4️⃣ WEBHOOK LOGS TABLE (SPEC)
-- ===============================
CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    event VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | success | failed
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMP,
    next_retry_at TIMESTAMP,
    response_code INTEGER,
    response_body TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_merchant_id
ON webhook_logs(merchant_id);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_status
ON webhook_logs(status);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_next_retry
ON webhook_logs(next_retry_at)
WHERE status = 'pending';

-- ===============================
-- 5️⃣ IDEMPOTENCY KEYS TABLE (SPEC)
-- ===============================
CREATE TABLE IF NOT EXISTS idempotency_keys (
    key VARCHAR(255) NOT NULL,
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    response JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    expires_at TIMESTAMP NOT NULL,
    PRIMARY KEY (merchant_id, key)
);

COMMIT;
