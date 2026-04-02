-- ==============================================================================
-- staffing_db :: V1 — Staff Assignments Table
-- Internal HR: TA route assignments, EXT officer territories
-- (Not in DalupothaDB.sql yet — designed based on BRD requirements)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS staff_profiles (
    profile_id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Cross-service reference to auth_db.users
    user_id             UUID        UNIQUE NOT NULL,    -- → auth_db.users
    full_name           VARCHAR(100) NOT NULL,
    employee_id         VARCHAR(50) UNIQUE NOT NULL,    -- e.g. TA-2024-007
    role                VARCHAR(20) NOT NULL
                        CHECK (role IN ('TA','MG','EXT','SK','ST','FT')),

    -- Assignment
    assigned_area       VARCHAR(100),   -- e.g. "Uva Halpewatte"
    in_charge_zone      VARCHAR(50),    -- for EXT officers
    is_active           BOOLEAN         DEFAULT TRUE,
    joined_date         DATE,
    created_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ta_supplier_assignments (
    assignment_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    ta_user_id          UUID        NOT NULL,       -- → auth_db.users (role=TA)
    supplier_id         UUID        NOT NULL,       -- → auth_db.small_holders
    assigned_date       DATE        DEFAULT CURRENT_DATE,
    is_active           BOOLEAN     DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_sp_user_id    ON staff_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_sp_role       ON staff_profiles(role);
CREATE INDEX IF NOT EXISTS idx_ta_ta_id      ON ta_supplier_assignments(ta_user_id);
CREATE INDEX IF NOT EXISTS idx_ta_supplier   ON ta_supplier_assignments(supplier_id);
