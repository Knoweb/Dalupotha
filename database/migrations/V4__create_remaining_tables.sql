-- V4: Create financial_ledger, inventory, service_requests, and otp_codes tables

-- Financial Ledger
CREATE TYPE transaction_type   AS ENUM ('ADVANCE', 'DEBT', 'PAYOUT', 'DEDUCTION');
CREATE TYPE transaction_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

CREATE TABLE financial_ledger (
    transaction_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id      UUID NOT NULL REFERENCES small_holders(supplier_id),
    transaction_type transaction_type   NOT NULL,
    amount           DECIMAL(12, 2) NOT NULL,
    status           transaction_status NOT NULL DEFAULT 'PENDING',
    description      TEXT,
    approved_by      UUID REFERENCES users(user_id),  -- MG/EXT who approved
    reference_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fl_supplier_id ON financial_ledger(supplier_id);
CREATE INDEX idx_fl_type        ON financial_ledger(transaction_type);
CREATE INDEX idx_fl_status      ON financial_ledger(status);

-- Inventory
CREATE TYPE item_type AS ENUM ('FERTILIZER', 'LEAF_BAG');

CREATE TABLE inventory (
    item_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_type    item_type    NOT NULL,
    item_name    VARCHAR(150) NOT NULL,
    quantity     DECIMAL(10, 2) NOT NULL DEFAULT 0,
    unit         VARCHAR(20)  NOT NULL DEFAULT 'kg',  -- kg, bags, etc.
    unit_cost    DECIMAL(10, 2),
    last_updated TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Service Requests
CREATE TYPE request_type   AS ENUM ('ADVANCE', 'FERTILIZER', 'LEAF_BAG', 'TRANSPORT', 'ADVISORY', 'MACHINE_RENT');
CREATE TYPE request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DISPATCHED', 'COMPLETED');

CREATE TABLE service_requests (
    request_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id   UUID NOT NULL REFERENCES small_holders(supplier_id),
    request_type  request_type   NOT NULL,
    status        request_status NOT NULL DEFAULT 'PENDING',
    quantity      DECIMAL(10, 2),          -- for fertilizer/leaf bag
    amount        DECIMAL(12, 2),          -- for advance
    notes         TEXT,
    processed_by  UUID REFERENCES users(user_id),
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sr_supplier_id ON service_requests(supplier_id);
CREATE INDEX idx_sr_type        ON service_requests(request_type);
CREATE INDEX idx_sr_status      ON service_requests(status);

-- OTP Codes (for Small Holder login/registration)
CREATE TYPE otp_purpose AS ENUM ('REGISTRATION', 'LOGIN');

CREATE TABLE otp_codes (
    otp_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact     VARCHAR(20) NOT NULL,
    code        VARCHAR(6)  NOT NULL,
    purpose     otp_purpose NOT NULL DEFAULT 'LOGIN',
    is_used     BOOLEAN     NOT NULL DEFAULT FALSE,
    expires_at  TIMESTAMP   NOT NULL,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_contact ON otp_codes(contact);
CREATE INDEX idx_otp_expires ON otp_codes(expires_at);

-- Audit Logs (security requirement)
CREATE TYPE audit_action AS ENUM ('MANUAL_WEIGHT_OVERRIDE', 'ADVANCE_APPROVAL', 'ADVANCE_REJECTION', 'PAYMENT_DEDUCTION', 'USER_LOGIN', 'USER_LOGOUT');

CREATE TABLE audit_logs (
    audit_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(user_id),
    action      audit_action NOT NULL,
    entity_id   UUID,          -- ID of the affected record
    description TEXT,
    ip_address  VARCHAR(45),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_action  ON audit_logs(action);
