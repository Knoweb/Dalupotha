-- ==============================================================================
-- finance_db :: V2 — Service Requests Table
-- Workflows: Fertilizer, Transport, Machinery renting, Advisory, Advance
-- Matches DalupothaDB.sql exactly.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS service_requests (
    request_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Cross-service UUID references (no FK)
    supplier_id     UUID        NOT NULL,   -- → auth_db.small_holders
    item_id         UUID,                   -- → inventory_db.inventory (nullable)
    created_by_id   UUID,                   -- → auth_db.users (TA or EXT)

    request_type    VARCHAR(50) NOT NULL
                    CHECK (request_type IN
                        ('FERTILIZER','TRANSPORT','MACHINE_RENT','ADVISORY','ADVANCE')),
    quantity        INTEGER,
    status          VARCHAR(20) DEFAULT 'PENDING'
                    CHECK (status IN
                        ('PENDING','APPROVED_BY_EXT','DISPATCHED','REJECTED')),
    notes           TEXT,
    request_date    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sr_supplier_id   ON service_requests(supplier_id);
CREATE INDEX IF NOT EXISTS idx_sr_type          ON service_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_sr_status        ON service_requests(status);
