-- Allow request types used by the TA request tab and support cancellation.

ALTER TABLE service_requests
    DROP CONSTRAINT IF EXISTS service_requests_request_type_check;

ALTER TABLE service_requests
    ADD CONSTRAINT service_requests_request_type_check
        CHECK (request_type IN
            ('FERTILIZER','TRANSPORT','MACHINE_RENT','ADVISORY','ADVANCE','TOOL_PURCHASE','TOOL_RENT','OTHER'));

ALTER TABLE service_requests
    DROP CONSTRAINT IF EXISTS service_requests_status_check;

ALTER TABLE service_requests
    ADD CONSTRAINT service_requests_status_check
        CHECK (status IN
            ('PENDING','APPROVED_BY_EXT','DISPATCHED','REJECTED','CANCELLED'));