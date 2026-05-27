-- ==============================================================================
-- finance_db :: V11 — Add estate_id to service_requests
-- Required for multi-estate data isolation
-- ==============================================================================

ALTER TABLE service_requests
    ADD COLUMN IF NOT EXISTS estate_id UUID;

CREATE INDEX IF NOT EXISTS idx_sr_estate_id ON service_requests(estate_id);
