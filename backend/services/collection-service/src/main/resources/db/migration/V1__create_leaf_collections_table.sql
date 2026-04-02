-- ==============================================================================
-- collection_db :: V1 — Leaf Collections Table
-- Brought Leaf Register — daily green leaf collection records
-- Matches DalupothaDB.sql exactly.
-- NOTE: supplier_id & transport_agent_id are UUID references — no FK constraint
--       because they live in auth_db (cross-service integrity handled at app layer)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS leaf_collections (
    collection_id       UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Cross-service references (no FK — validated via auth-service API)
    supplier_id         UUID            NOT NULL,   -- → auth_db.small_holders.supplier_id
    transport_agent_id  UUID            NOT NULL,   -- → auth_db.users.user_id (role=TA)

    -- Weight data (from BLE hanging scale via mobile app)
    gross_weight        DECIMAL(8,2)    NOT NULL,
    water_deduction     DECIMAL(8,2)    DEFAULT 0.00,
    net_weight          DECIMAL(8,2)    NOT NULL,
    quality_grade       VARCHAR(20),

    -- GPS at moment of collection
    gps_lat             DECIMAL(10,8)   NOT NULL,
    gps_long            DECIMAL(11,8)   NOT NULL,

    -- Timestamps
    collection_time     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Offline-first sync status
    sync_status         VARCHAR(20)     DEFAULT 'SYNCED'
                        CHECK (sync_status IN ('PENDING_SYNC', 'SYNCED')),

    -- Supabase realtime broadcast timestamp
    synced_at           TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_lc_supplier_id   ON leaf_collections(supplier_id);
CREATE INDEX IF NOT EXISTS idx_lc_ta_id         ON leaf_collections(transport_agent_id);
CREATE INDEX IF NOT EXISTS idx_lc_time          ON leaf_collections(collection_time DESC);
CREATE INDEX IF NOT EXISTS idx_lc_sync_status   ON leaf_collections(sync_status);
