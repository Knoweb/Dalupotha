-- ==============================================================================
-- auth_db :: V3 — OTP Codes Table (auth-service internal)
-- Used for Small Holder login and registration OTP verification
-- ==============================================================================

CREATE TABLE IF NOT EXISTS otp_codes (
    otp_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    contact         VARCHAR(15) NOT NULL,
    code            VARCHAR(6)  NOT NULL,
    purpose         VARCHAR(20) NOT NULL
                    CHECK (purpose IN ('LOGIN','REGISTRATION')),
    is_used         BOOLEAN     DEFAULT FALSE,
    expires_at      TIMESTAMP   NOT NULL,
    created_at      TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_contact ON otp_codes(contact);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at);

-- Auto-cleanup: delete expired OTPs older than 1 hour (run via pg_cron or app scheduler)
-- DELETE FROM otp_codes WHERE expires_at < NOW() - INTERVAL '1 hour';
