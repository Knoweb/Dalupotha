-- V2: Create small_holders table

CREATE TABLE small_holders (
    supplier_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    passbook_no   VARCHAR(30) NOT NULL UNIQUE,   -- e.g. PB-0934
    land_name     VARCHAR(200) NOT NULL,
    address       TEXT,
    gps_lat       DECIMAL(10, 8),
    gps_long      DECIMAL(11, 8),
    in_charge_id  UUID REFERENCES users(user_id), -- Extension Officer in charge
    registered_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sh_user_id      ON small_holders(user_id);
CREATE INDEX idx_sh_passbook     ON small_holders(passbook_no);
CREATE INDEX idx_sh_in_charge    ON small_holders(in_charge_id);
