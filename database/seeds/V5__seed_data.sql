-- V5: Seed data for development

-- Seed users (passwords are bcrypt of 'password123')
INSERT INTO users (user_id, role, full_name, contact, employee_id, hashed_password, status)
VALUES
  -- Manager
  ('11111111-0000-0000-0000-000000000001', 'MG',  'Priyantha Jayawardena',   '+94771000001', 'MG-2024-001', '$2a$12$9z2m3Xb5K8vWqNpR7tLjOuY4sBkHdGfEwIcAiMxLsVzTnRpKuQoWe', 'ACTIVE'),
  -- Extension Officer
  ('11111111-0000-0000-0000-000000000002', 'EXT', 'Nimal Perera',            '+94772000002', 'EXT-2024-001', '$2a$12$9z2m3Xb5K8vWqNpR7tLjOuY4sBkHdGfEwIcAiMxLsVzTnRpKuQoWe', 'ACTIVE'),
  -- Transport Agents
  ('11111111-0000-0000-0000-000000000003', 'TA',  'Kumara Perera',           '+94773000003', 'TA-2024-007', '$2a$12$9z2m3Xb5K8vWqNpR7tLjOuY4sBkHdGfEwIcAiMxLsVzTnRpKuQoWe', 'ACTIVE'),
  ('11111111-0000-0000-0000-000000000004', 'TA',  'Roshan Mendis',           '+94773000004', 'TA-2024-008', '$2a$12$9z2m3Xb5K8vWqNpR7tLjOuY4sBkHdGfEwIcAiMxLsVzTnRpKuQoWe', 'ACTIVE'),
  -- Store Keeper
  ('11111111-0000-0000-0000-000000000005', 'SK',  'Kamal Silva',             '+94774000005', 'SK-2024-001', '$2a$12$9z2m3Xb5K8vWqNpR7tLjOuY4sBkHdGfEwIcAiMxLsVzTnRpKuQoWe', 'ACTIVE'),
  -- Factory Staff
  ('11111111-0000-0000-0000-000000000006', 'FT',  'Saman Bandara',           '+94775000006', 'FT-2024-001', '$2a$12$9z2m3Xb5K8vWqNpR7tLjOuY4sBkHdGfEwIcAiMxLsVzTnRpKuQoWe', 'ACTIVE'),
  -- Office Staff
  ('11111111-0000-0000-0000-000000000007', 'ST',  'Nilufar Ratnayake',       '+94776000007', 'ST-2024-001', '$2a$12$9z2m3Xb5K8vWqNpR7tLjOuY4sBkHdGfEwIcAiMxLsVzTnRpKuQoWe', 'ACTIVE'),
  -- Small Holders (no password, OTP login)
  ('22222222-0000-0000-0000-000000000001', 'SH',  'Sunil Bandara',           '+94711001001', NULL, NULL, 'ACTIVE'),
  ('22222222-0000-0000-0000-000000000002', 'SH',  'Jayasekara Ranjith',      '+94711001002', NULL, NULL, 'ACTIVE'),
  ('22222222-0000-0000-0000-000000000003', 'SH',  'Perera D.W.',             '+94711001003', NULL, NULL, 'ACTIVE'),
  ('22222222-0000-0000-0000-000000000004', 'SH',  'Silva M.K.',              '+94711001004', NULL, NULL, 'ACTIVE'),
  ('22222222-0000-0000-0000-000000000005', 'SH',  'Fernando Lakshman',       '+94711001005', NULL, NULL, 'ACTIVE');

-- Seed small_holders
INSERT INTO small_holders (supplier_id, user_id, passbook_no, land_name, address, gps_lat, gps_long, in_charge_id)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'PB-0934', 'Halpewatte Estate – Block C', 'Halpewatte, Uva', 6.9271, 80.7714, '11111111-0000-0000-0000-000000000002'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'PB-0142', 'Jayasekara Land',             'Uva Halpewatte',  6.9300, 80.7800, '11111111-0000-0000-0000-000000000002'),
  ('aaaaaaaa-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000003', 'PB-0089', 'Perera Tea Garden',           'Badulla',         6.9800, 81.0600, '11111111-0000-0000-0000-000000000002'),
  ('aaaaaaaa-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000004', 'PB-0231', 'Silva Upper Block',           'Ella',            6.8667, 81.0456, '11111111-0000-0000-0000-000000000002'),
  ('aaaaaaaa-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000005', 'PB-0077', 'Fernando Estate',             'Bandarawela',     6.8300, 80.9900, '11111111-0000-0000-0000-000000000002');

-- Seed inventory
INSERT INTO inventory (item_type, item_name, quantity, unit, unit_cost)
VALUES
  ('FERTILIZER', 'Urea Fertilizer 46%',         2500.00, 'kg',   115.00),
  ('FERTILIZER', 'TSP Fertilizer',              1800.00, 'kg',   145.00),
  ('LEAF_BAG',   'Standard Leaf Bag (Large)',   5000.00, 'bags',  12.50),
  ('LEAF_BAG',   'Standard Leaf Bag (Medium)', 3000.00, 'bags',   8.00);

-- Seed sample leaf collections
INSERT INTO leaf_collections (supplier_id, transport_agent_id, gross_weight, net_weight, gps_lat, gps_long, gps_status, sync_status, collected_at, synced_at)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000003', 87.50,  85.00,  6.9271, 80.7714, 'GPS',    'SYNCED', NOW() - INTERVAL '1 day',  NOW() - INTERVAL '1 day'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000003', 124.00, 121.00, 6.9300, 80.7800, 'GPS',    'SYNCED', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000003', 63.00,  63.00,  NULL,   NULL,    'NO_GPS', 'SYNCED', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
  ('aaaaaaaa-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000003', 201.50, 196.50, 6.8667, 81.0456, 'GPS',    'SYNCED', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000003', 275.60, 270.00, 6.9271, 80.7714, 'GPS',    'SYNCED', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days');

-- Seed financial ledger
INSERT INTO financial_ledger (supplier_id, transaction_type, amount, status, description, reference_date)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'ADVANCE',    8000.00,  'APPROVED',  'February 2026 advance',         '2026-02-01'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'DEBT',       3200.00,  'COMPLETED', 'Urea Fertilizer – Feb 2026',    '2026-02-15'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'DEBT',       2600.00,  'COMPLETED', 'Leaf Bags – Feb 2026',          '2026-02-10'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'PAYOUT',     12500.00, 'PENDING',   'February 2026 balance payment', '2026-02-28'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'ADVANCE',    15000.00, 'APPROVED',  'February 2026 advance',         '2026-02-21');
