-- V3: Create leaf_collections table

CREATE TYPE sync_status AS ENUM ('QUEUED', 'SYNCING', 'SYNCED', 'FAILED');
CREATE TYPE gps_status  AS ENUM ('GPS', 'NO_GPS', 'MANUAL');

CREATE TABLE leaf_collections (
    collection_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id         UUID NOT NULL REFERENCES small_holders(supplier_id),
    transport_agent_id  UUID NOT NULL REFERENCES users(user_id),
    gross_weight        DECIMAL(8, 2) NOT NULL,       -- kg from IoT scale
    net_weight          DECIMAL(8, 2),                 -- after deductions
    gps_lat             DECIMAL(10, 8),
    gps_long            DECIMAL(11, 8),
    gps_status          gps_status NOT NULL DEFAULT 'GPS',
    is_manual_override  BOOLEAN NOT NULL DEFAULT FALSE, -- audited
    override_reason     TEXT,
    sync_status         sync_status NOT NULL DEFAULT 'QUEUED',
    collected_at        TIMESTAMP NOT NULL,            -- time on device
    synced_at           TIMESTAMP,                     -- time server received it
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lc_supplier_id    ON leaf_collections(supplier_id);
CREATE INDEX idx_lc_ta_id          ON leaf_collections(transport_agent_id);
CREATE INDEX idx_lc_collected_at   ON leaf_collections(collected_at);
CREATE INDEX idx_lc_sync_status    ON leaf_collections(sync_status);
