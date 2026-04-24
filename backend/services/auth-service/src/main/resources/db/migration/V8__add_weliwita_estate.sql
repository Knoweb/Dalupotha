-- ==============================================================================
-- auth_db :: V8 — Add Weliwita Estate and Primary Manager
-- ==============================================================================

-- 1. Insert Weliwita Estate
INSERT INTO estates (name, code) 
VALUES ('Weliwita Estate', 'WEL-01') 
ON CONFLICT (name) DO NOTHING;

-- 2. Update existing manager if they exist to be part of Weliwita Estate
-- We assume the manager role is 'MG' as per system standards
UPDATE users 
SET estate_id = (SELECT estate_id FROM estates WHERE name = 'Weliwita Estate')
WHERE role = 'MG';
