-- ==============================================================================
-- inventory_db :: V3 — Add estate_id to inventory
-- Required for multi-estate data isolation
-- ==============================================================================

ALTER TABLE inventory
    ADD COLUMN IF NOT EXISTS estate_id UUID;

CREATE INDEX IF NOT EXISTS idx_inventory_estate_id ON inventory(estate_id);
