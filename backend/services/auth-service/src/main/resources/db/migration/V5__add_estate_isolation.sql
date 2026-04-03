-- ==============================================================================
-- auth_db :: V5 — Estate Isolation Support
-- Creates estates table and links all core entities for multi-tenancy
-- ==============================================================================

-- 1. Create Estates Master Table
CREATE TABLE IF NOT EXISTS estates (
    estate_id   UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100)    NOT NULL UNIQUE,
    code        VARCHAR(20)     NOT NULL UNIQUE, -- e.g. 'UVA-01'
    is_active   BOOLEAN         DEFAULT TRUE,
    created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add estate_id to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS estate_id UUID REFERENCES estates(estate_id);

-- 3. Add estate_id to small_holders
-- Note: arcs is land area in perches/acres as per tea industry standards
ALTER TABLE small_holders ADD COLUMN IF NOT EXISTS estate_id UUID REFERENCES estates(estate_id);
ALTER TABLE small_holders ADD COLUMN IF NOT EXISTS arcs DECIMAL(10,2); 

-- 4. Add estate_id to transport_agents
ALTER TABLE transport_agents ADD COLUMN IF NOT EXISTS estate_id UUID REFERENCES estates(estate_id);

-- 5. Seed initial estates for demo
INSERT INTO estates (name, code) VALUES ('Uva Halpewatte', 'UVA-HALP') ON CONFLICT DO NOTHING;
INSERT INTO estates (name, code) VALUES ('Green Hill Division', 'GHD-01') ON CONFLICT DO NOTHING;
INSERT INTO estates (name, code) VALUES ('Riverside Estate', 'RIV-09') ON CONFLICT DO NOTHING;
