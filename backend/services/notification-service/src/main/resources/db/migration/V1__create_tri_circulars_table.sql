-- ==============================================================================
-- notification_db :: V1 — TRI Circulars Table
-- Tea Research Institute advisory documents & factory announcements
-- Matches DalupothaDB.sql exactly. (Was MISSING from old migrations — now added)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS tri_circulars (
    circular_id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    title               VARCHAR(200)    NOT NULL,
    content_url         VARCHAR(255)    NOT NULL,     -- URL to PDF/document storage
    published_date      TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    target_audience     VARCHAR(50)     DEFAULT 'ALL'
                        CHECK (target_audience IN ('ALL','SMALL_HOLDERS','MANAGEMENT')),

    -- Publisher reference (cross-service UUID — no FK)
    published_by_id     UUID,           -- → auth_db.users (MG role)
    is_active           BOOLEAN         DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_tc_audience ON tri_circulars(target_audience);
CREATE INDEX IF NOT EXISTS idx_tc_date     ON tri_circulars(published_date DESC);
CREATE INDEX IF NOT EXISTS idx_tc_active   ON tri_circulars(is_active);
