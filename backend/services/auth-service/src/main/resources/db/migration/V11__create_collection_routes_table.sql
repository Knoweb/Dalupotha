-- ==============================================================================
-- auth_db :: V11 — Collection Routes Table
-- Aligned exactly to CollectionRoute.java entity
-- ==============================================================================

CREATE TABLE IF NOT EXISTS collection_routes (
    route_id    UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255)    NOT NULL,
    code        VARCHAR(50),
    estate_id   UUID            NOT NULL REFERENCES estates(estate_id) ON DELETE CASCADE,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_routes_estate_id ON collection_routes(estate_id);
