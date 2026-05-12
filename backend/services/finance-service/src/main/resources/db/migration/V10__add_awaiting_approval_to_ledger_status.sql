-- Add AWAITING_APPROVAL to financial_ledger status check constraint
ALTER TABLE financial_ledger
    DROP CONSTRAINT IF EXISTS financial_ledger_status_check;

ALTER TABLE financial_ledger
    ADD CONSTRAINT financial_ledger_status_check
        CHECK (status IN ('PENDING','APPROVED','REJECTED','CLEARED','AWAITING_APPROVAL'));
