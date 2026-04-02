-- ==============================================================================
-- inventory_db :: V1 — Inventory Table
-- Stores: Fertilizer, Leaf Bags, Machinery
-- Matches DalupothaDB.sql exactly.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS inventory (
    item_id             UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    item_category       VARCHAR(50)     NOT NULL
                        CHECK (item_category IN ('FERTILIZER','LEAF_BAG','MACHINERY')),
    item_name           VARCHAR(100)    NOT NULL,
    quantity_in_stock   INTEGER         DEFAULT 0,
    unit_cost           DECIMAL(10,2)   NOT NULL,
    last_updated        TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    created_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(item_category);
CREATE INDEX IF NOT EXISTS idx_inventory_name     ON inventory(item_name);
