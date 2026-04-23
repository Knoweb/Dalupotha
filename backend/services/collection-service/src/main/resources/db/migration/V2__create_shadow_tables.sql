-- ==============================================================================
-- collection_db :: V2 — Support Tables (Shadow Tables)
-- These tables store basic info for cross-service linking with auth_service.
-- ==============================================================================

-- 1. Users table (Shadow)
CREATE TABLE IF NOT EXISTS users (
    user_id     UUID            PRIMARY KEY,
    role        VARCHAR(20)     NOT NULL, -- TA, SH, etc.
    full_name   VARCHAR(255)    NOT NULL,
    employee_id VARCHAR(50)
);

-- 2. Small Holders table (Shadow)
CREATE TABLE IF NOT EXISTS small_holders (
    supplier_id UUID            PRIMARY KEY,
    user_id     UUID            NOT NULL REFERENCES users(user_id),
    passbook_no VARCHAR(50)     NOT NULL,
    land_name   VARCHAR(100)    NOT NULL,
    estate_id   UUID,
    arcs        DECIMAL(10,2)
);

-- 3. Update leaf_collections to use foreign keys to these shadow tables
-- (Optional but recommended for local consistency)
ALTER TABLE leaf_collections 
    ADD CONSTRAINT fk_collection_supplier 
    FOREIGN KEY (supplier_id) REFERENCES small_holders(supplier_id);

-- 4. Insert fallback/test data if needed (optional)
-- This ensures the system works immediately for existing test agents/suppliers
