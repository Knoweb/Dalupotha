-- ==============================================================================
-- auth_db :: V1 — Users Table
-- Aligned exactly to User.java entity and UserRole.java enum
-- ==============================================================================

-- Custom enum type for roles
CREATE TYPE user_role AS ENUM ('MG', 'EXT', 'TA', 'SK', 'FT', 'ST', 'SH');

CREATE TABLE IF NOT EXISTS users (
    user_id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    role            user_role   NOT NULL,
    full_name       VARCHAR(100) NOT NULL,
    contact         VARCHAR(20)  NOT NULL UNIQUE,
    employee_id     VARCHAR(50)  UNIQUE,
    hashed_password VARCHAR(255),
    status          VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_role    ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_contact ON users(contact);
CREATE INDEX IF NOT EXISTS idx_users_status  ON users(status);
