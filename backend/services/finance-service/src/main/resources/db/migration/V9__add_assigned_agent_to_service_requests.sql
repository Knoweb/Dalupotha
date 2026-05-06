-- ==============================================================================
-- finance_db :: V9 — Add Assigned Agent to Service Requests
-- Link requests to the specific agent in charge for logistical fulfillment
-- ==============================================================================

ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS assigned_agent_id UUID;
CREATE INDEX IF NOT EXISTS idx_sr_assigned_agent ON service_requests(assigned_agent_id);
