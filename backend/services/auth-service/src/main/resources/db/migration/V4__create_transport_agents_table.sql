-- ==============================================================================
-- auth_db :: V3 — Transport Agents Table
-- Aligned exactly to TransportAgent.java entity
-- ==============================================================================

CREATE TABLE IF NOT EXISTS transport_agents (
    transport_agent_id  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID            NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    employee_id         VARCHAR(50)     NOT NULL UNIQUE,
    vehicle_no          VARCHAR(20),
    route_name          VARCHAR(100),
    registered_at       TIMESTAMP,
    updated_at          TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ta_user_id      ON transport_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_ta_employee_id  ON transport_agents(employee_id);
