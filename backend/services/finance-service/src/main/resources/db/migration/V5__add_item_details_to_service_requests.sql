ALTER TABLE service_requests
    ADD COLUMN IF NOT EXISTS item_details TEXT;