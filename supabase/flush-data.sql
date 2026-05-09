-- Flush all application data (keeps schema, roles, permissions, system accounts, and default admin)
-- Run this in the Supabase SQL Editor to reset your database to a clean state.

BEGIN;

-- Child/transactional tables first (respect FK constraints)
DELETE FROM audit_logs;
DELETE FROM journal_lines;
DELETE FROM journal_entries;
DELETE FROM fee_transactions;
DELETE FROM salary_payments;
DELETE FROM expenses;
DELETE FROM inventory_transactions;
DELETE FROM inventory_items;
DELETE FROM fee_heads;
DELETE FROM fee_configs;
DELETE FROM students;
DELETE FROM reason_tags;

-- Non-system accounts (keep the 10 seeded system accounts)
DELETE FROM accounts WHERE is_system = FALSE;

-- Non-admin staff (keep the default admin staff record)
DELETE FROM staff WHERE email <> 'admin@school.com';

-- Non-admin auth users (keep the default admin auth user)
DELETE FROM auth.users WHERE email <> 'admin@school.com';

COMMIT;
