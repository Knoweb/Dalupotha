-- ==============================================================================
-- auth_db :: V6 — Schema Adjustments
-- 1. Increase users.contact length to accommodate emails
-- 2. Add missing address and phone fields to estates
-- ==============================================================================

-- 1. Expand contact field (was 20, now 100)
ALTER TABLE users ALTER COLUMN contact TYPE VARCHAR(100);

-- 2. Add fields to estates
ALTER TABLE estates ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE estates ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
