-- Flush all application data (keeps schema, roles, permissions, default accounts, and default admin)
-- Run this in the Supabase SQL Editor to reset your database to a clean state.

BEGIN;

-- Child/transactional tables first (respect FK constraints)
DELETE FROM audit_logs;
DELETE FROM fee_transactions;
DELETE FROM salary_payments;
DELETE FROM expenses;
DELETE FROM inventory_transactions;
DELETE FROM inventory_items;
DELETE FROM account_adjustments;
DELETE FROM fee_heads;
DELETE FROM fee_configs;
DELETE FROM students;
DELETE FROM reason_tags;

-- Non-seeded accounts (keep Cash, UPI, Bank)
DELETE FROM accounts WHERE name NOT IN ('Cash', 'UPI', 'Bank');

-- Non-admin staff (keep the default admin staff record)
DELETE FROM staff WHERE email <> 'admin@school.com';

-- Non-admin auth users (keep the default admin auth user)
DELETE FROM auth.users WHERE email <> 'admin@school.com';

COMMIT;
