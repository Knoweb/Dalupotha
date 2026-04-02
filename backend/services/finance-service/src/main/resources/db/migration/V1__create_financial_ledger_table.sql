-- ==============================================================================
-- finance_db :: V1 — Financial Ledger Table
-- Unified ledger: Advances, Debts, Balance Payments
-- Matches DalupothaDB.sql exactly.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS financial_ledger (
    transaction_id      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Cross-service UUID references (no FK — validated at app layer)
    supplier_id         UUID            NOT NULL,   -- → auth_db.small_holders
    approver_id         UUID,                       -- → auth_db.users (EXT/MG role)

    transaction_type    VARCHAR(20)     NOT NULL
                        CHECK (transaction_type IN ('ADVANCE','DEBT','PAYOUT')),
    amount              DECIMAL(12,2)   NOT NULL,
    description         TEXT,
    transaction_date    TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    status              VARCHAR(20)     DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','APPROVED','CLEARED'))
);

CREATE INDEX IF NOT EXISTS idx_fl_supplier_id ON financial_ledger(supplier_id);
CREATE INDEX IF NOT EXISTS idx_fl_type        ON financial_ledger(transaction_type);
CREATE INDEX IF NOT EXISTS idx_fl_status      ON financial_ledger(status);
CREATE INDEX IF NOT EXISTS idx_fl_date        ON financial_ledger(transaction_date DESC);
