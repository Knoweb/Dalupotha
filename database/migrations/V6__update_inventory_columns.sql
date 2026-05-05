-- V6: Update inventory table to match UI and entity requirements
ALTER TYPE item_type ADD VALUE 'MACHINERY';

ALTER TABLE inventory 
RENAME COLUMN item_type TO item_category;

ALTER TABLE inventory 
RENAME COLUMN quantity TO quantity_in_stock;

ALTER TABLE inventory 
ADD COLUMN reserved_quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
ADD COLUMN reorder_level DECIMAL(10, 2) NOT NULL DEFAULT 0,
ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT NOW();

-- Update existing column type to allow string if needed, or keep enum but the rename already happened.
-- PostgreSQL RENAME COLUMN works on columns of any type.
