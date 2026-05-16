-- FULL RESET: Drops all Schollet tables and types so you can re-run the migration.
-- WARNING: This deletes ALL data. Run this first, then paste 00001_initial_schema.sql.

BEGIN;

-- Drop triggers on auth.users (if any)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user();
DROP FUNCTION IF EXISTS handle_new_user();

-- Drop tables (CASCADE handles FK dependencies)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS salary_payments CASCADE;
DROP TABLE IF EXISTS fee_transactions CASCADE;
DROP TABLE IF EXISTS fee_heads CASCADE;
DROP TABLE IF EXISTS fee_configs CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS inventory_transactions CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;
DROP TABLE IF EXISTS account_adjustments CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS reason_tags CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- Drop legacy ledger tables that may exist from older runs
DROP TABLE IF EXISTS journal_lines CASCADE;
DROP TABLE IF EXISTS journal_entries CASCADE;

-- Drop enum types
DROP TYPE IF EXISTS student_status CASCADE;
DROP TYPE IF EXISTS grade_enum CASCADE;
DROP TYPE IF EXISTS section_enum CASCADE;
DROP TYPE IF EXISTS gender_enum CASCADE;
DROP TYPE IF EXISTS blood_group_enum CASCADE;
DROP TYPE IF EXISTS inventory_txn_type CASCADE;
DROP TYPE IF EXISTS reason_tag_type CASCADE;

-- Drop legacy enums that may exist from older runs
DROP TYPE IF EXISTS payment_mode CASCADE;
DROP TYPE IF EXISTS account_type CASCADE;
DROP TYPE IF EXISTS reference_type CASCADE;

-- NOTE: To clear auth users, delete them manually from:
-- Supabase Dashboard → Authentication → Users
-- (DELETE FROM auth.users requires the supabase_auth_admin role,
--  which the SQL Editor's postgres role doesn't have in cloud projects.)

COMMIT;
