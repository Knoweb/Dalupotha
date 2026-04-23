-- ==============================================================================
-- auth_db :: V7 — Make small_holder optional columns fully nullable
-- land_name and arcs are not collected during self-registration.
-- They can be populated later via the management dashboard (EXT officer).
-- ==============================================================================

ALTER TABLE small_holders
    ALTER COLUMN land_name DROP NOT NULL;
