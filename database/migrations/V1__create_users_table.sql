-- V1: Create users table
-- Roles: MG (Manager), EXT (Extension Officer), TA (Transport Agent),
--        SK (Store Keeper), FT (Factory Staff), ST (Office Staff), SH (Small Holder)

CREATE TYPE user_role AS ENUM ('MG', 'EXT', 'TA', 'SK', 'FT', 'ST', 'SH');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

CREATE TABLE users (
    user_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role         user_role    NOT NULL,
    full_name    VARCHAR(150) NOT NULL,
    contact      VARCHAR(20)  NOT NULL UNIQUE,
    employee_id  VARCHAR(50)  UNIQUE,           -- e.g. TA-2024-007 (null for Small Holders)
    hashed_password VARCHAR(255),               -- null for Small Holders (OTP-only)
    status       user_status  NOT NULL DEFAULT 'ACTIVE',
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role   ON users(role);
CREATE INDEX idx_users_contact ON users(contact);
CREATE INDEX idx_users_employee_id ON users(employee_id);
