-- Add item_type column to service_requests table
ALTER TABLE service_requests ADD COLUMN item_type VARCHAR(255);
