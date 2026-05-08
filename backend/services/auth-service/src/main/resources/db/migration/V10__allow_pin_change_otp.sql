-- ==============================================================================
-- auth_db :: V6 — Aggressive update of OTP purpose constraint
-- ==============================================================================

-- Drop the constraint by searching for it if the name is different
DO $$
DECLARE
    constraint_name RECORD;
BEGIN
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'otp_codes'::regclass 
          AND contype = 'c' 
          AND pg_get_constraintdef(oid) LIKE '%purpose%'
    LOOP
        EXECUTE 'ALTER TABLE otp_codes DROP CONSTRAINT ' || constraint_name.conname;
    END LOOP;
END $$;

ALTER TABLE otp_codes ADD CONSTRAINT otp_codes_purpose_check CHECK (purpose IN ('LOGIN', 'REGISTRATION', 'PIN_CHANGE'));
