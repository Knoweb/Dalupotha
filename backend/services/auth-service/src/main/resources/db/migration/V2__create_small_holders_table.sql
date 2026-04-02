-- ==============================================================================
-- auth_db :: V2 — Small Holders Table
-- Aligned exactly to SmallHolder.java entity
-- ==============================================================================

CREATE TABLE IF NOT EXISTS small_holders (
    supplier_id     UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    passbook_no     VARCHAR(50)     NOT NULL UNIQUE,
    land_name       VARCHAR(100)    NOT NULL,
    address         TEXT,
    gps_lat         DECIMAL(10,8),
    gps_long        DECIMAL(11,8),
    in_charge_id    UUID            REFERENCES users(user_id),   -- EXT officer
    registered_at   TIMESTAMP,
    updated_at      TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sh_user_id    ON small_holders(user_id);
CREATE INDEX IF NOT EXISTS idx_sh_passbook   ON small_holders(passbook_no);
CREATE INDEX IF NOT EXISTS idx_sh_in_charge  ON small_holders(in_charge_id);
