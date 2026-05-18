-- ==============================================================================
-- auth_db :: V12 — Add route_name to small_holders
-- ==============================================================================

ALTER TABLE small_holders ADD COLUMN IF NOT EXISTS route_name VARCHAR(255);
