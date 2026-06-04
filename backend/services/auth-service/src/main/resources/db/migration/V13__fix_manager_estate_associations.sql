-- ==============================================================================
-- auth_db :: V13 — Fix broken manager → estate associations
-- Root cause: V8 migration set estate_id to 'Weliwita Estate' for ALL managers.
-- When that estate was removed/never created, all MG estate_ids became NULL.
-- New registrations also saved estate correctly, but could be wiped by the same issue.
--
-- This migration repairs associations by matching the manager's contact phone
-- to the phone number stored on their estate (set during estate registration).
-- ==============================================================================

-- 1. Fix MG users with null estate_id by matching contact = estate.phone
UPDATE users
SET estate_id = estates.estate_id
FROM estates
WHERE users.role = 'MG'
  AND users.estate_id IS NULL
  AND estates.phone IS NOT NULL
  AND users.contact = estates.phone;

-- 2. Fix MG users whose estate was matched by email stored as contact
UPDATE users
SET estate_id = estates.estate_id
FROM estates
WHERE users.role = 'MG'
  AND users.estate_id IS NULL
  AND estates.phone IS NOT NULL
  AND users.email = estates.phone;

-- 3. Log summary (informational — does not affect migration success)
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count FROM users WHERE role = 'MG' AND estate_id IS NULL;
    IF null_count > 0 THEN
        RAISE WARNING 'V13: % manager(s) still have null estate_id after repair. Manual review needed.', null_count;
    ELSE
        RAISE NOTICE 'V13: All manager estate associations repaired successfully.';
    END IF;
END $$;
