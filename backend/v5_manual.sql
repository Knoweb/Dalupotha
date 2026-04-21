CREATE TABLE IF NOT EXISTS estates (
    estate_id   UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100)    NOT NULL UNIQUE,
    code        VARCHAR(20)     NOT NULL UNIQUE,
    is_active   BOOLEAN         DEFAULT TRUE,
    created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS estate_id UUID REFERENCES estates(estate_id);
ALTER TABLE small_holders ADD COLUMN IF NOT EXISTS estate_id UUID REFERENCES estates(estate_id);
ALTER TABLE small_holders ADD COLUMN IF NOT EXISTS arcs DECIMAL(10,2);
ALTER TABLE transport_agents ADD COLUMN IF NOT EXISTS estate_id UUID REFERENCES estates(estate_id);
INSERT INTO estates (name, code) VALUES ('Uva Halpewatte', 'UVA-HALP') ON CONFLICT DO NOTHING;
INSERT INTO estates (name, code) VALUES ('Green Hill Division', 'GHD-01') ON CONFLICT DO NOTHING;
INSERT INTO estates (name, code) VALUES ('Riverside Estate', 'RIV-09') ON CONFLICT DO NOTHING;
