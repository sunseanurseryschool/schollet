-- Schollet: Initial Database Schema
-- All tables use UUID primary keys and RLS

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ROLES & PERMISSIONS
-- =============================================

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL
);

CREATE TABLE role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- =============================================
-- STAFF (linked to auth.users)
-- =============================================

CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role_id UUID NOT NULL REFERENCES roles(id),
  salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- STUDENTS
-- =============================================

CREATE TYPE student_status AS ENUM ('active', 'inactive', 'transferred');
CREATE TYPE grade_enum AS ENUM ('PreKG', 'LKG', 'UKG', '1', '2', '3', '4', '5');
CREATE TYPE section_enum AS ENUM ('A', 'B', 'C');
CREATE TYPE gender_enum AS ENUM ('male', 'female', 'other');
CREATE TYPE blood_group_enum AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown');

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admission_no TEXT NOT NULL UNIQUE,
  -- Basic
  name TEXT NOT NULL,
  gender gender_enum,
  date_of_birth DATE,
  blood_group blood_group_enum,
  nationality TEXT,
  religion TEXT,
  community TEXT,
  caste TEXT,
  aadhaar_no TEXT,
  grade grade_enum NOT NULL,
  section section_enum NOT NULL,
  status student_status NOT NULL DEFAULT 'active',
  -- Father
  father_name TEXT,
  father_occupation TEXT,
  father_company TEXT,
  father_mobile TEXT,
  father_email TEXT,
  father_annual_income NUMERIC(12,2),
  -- Mother
  mother_name TEXT,
  mother_occupation TEXT,
  mother_company TEXT,
  mother_mobile TEXT,
  mother_email TEXT,
  mother_annual_income NUMERIC(12,2),
  -- Guardian (optional)
  guardian_name TEXT,
  guardian_relationship TEXT,
  guardian_mobile TEXT,
  guardian_address TEXT,
  -- Contact + Address
  address_line TEXT,
  city TEXT,
  state TEXT,
  pin_code TEXT,
  emergency_contact TEXT,
  alternate_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_students_grade ON students(grade);
CREATE INDEX idx_students_status ON students(status);

-- =============================================
-- ACCOUNTS (payment buckets — Cash, UPI, Bank, etc.)
-- =============================================

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  is_online BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Manual adjustments to account balances (opening balance, corrections, petty
-- cash deposits, etc.). Immutable for audit integrity.
-- amount > 0 = increase, amount < 0 = decrease.
CREATE TABLE account_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  amount NUMERIC(12,2) NOT NULL CHECK (amount <> 0),
  reason TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_account_adjustments_account ON account_adjustments(account_id);

-- =============================================
-- FEE CONFIGURATION
-- =============================================

CREATE TABLE fee_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grade grade_enum NOT NULL,
  academic_year TEXT NOT NULL,
  total_fee NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(grade, academic_year)
);

CREATE TABLE fee_heads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fee_config_id UUID NOT NULL REFERENCES fee_configs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL
);

-- =============================================
-- FEE TRANSACTIONS
-- =============================================

CREATE TABLE fee_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id),
  fee_config_id UUID NOT NULL REFERENCES fee_configs(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  total_fee NUMERIC(12,2) NOT NULL,
  paid_amount NUMERIC(12,2) NOT NULL,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_reason TEXT,
  received_by UUID NOT NULL REFERENCES staff(id),
  receipt_no TEXT NOT NULL UNIQUE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fee_txn_student ON fee_transactions(student_id);
CREATE INDEX idx_fee_txn_date ON fee_transactions(payment_date);

-- =============================================
-- INVENTORY
-- =============================================

CREATE TYPE inventory_txn_type AS ENUM ('IN', 'OUT');

CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'pcs',
  min_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- account_id is required only for IN (purchase) transactions; OUT (issue) has no money flow.
CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  account_id UUID REFERENCES accounts(id),
  type inventory_txn_type NOT NULL,
  quantity INTEGER NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT account_required_for_purchase CHECK (
    (type = 'IN' AND account_id IS NOT NULL) OR type = 'OUT'
  )
);

-- =============================================
-- EXPENSES
-- =============================================

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  amount NUMERIC(12,2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  paid_by UUID NOT NULL REFERENCES staff(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- SALARY PAYMENTS
-- =============================================

CREATE TABLE salary_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES staff(id),
  account_id UUID NOT NULL REFERENCES accounts(id),
  amount NUMERIC(12,2) NOT NULL,
  month TEXT NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(staff_id, month)
);

-- =============================================
-- REASON TAGS
-- =============================================

CREATE TYPE reason_tag_type AS ENUM ('DISCOUNT', 'EXPENSE');

CREATE TABLE reason_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type reason_tag_type NOT NULL,
  UNIQUE(name, type)
);

-- =============================================
-- AUDIT LOGS
-- =============================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_logs(entity, entity_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- =============================================
-- SEED DATA: Roles & Permissions
-- =============================================

INSERT INTO permissions (code, description) VALUES
  ('CAN_COLLECT_FEES', 'Collect fee payments from students'),
  ('CAN_ADD_EXPENSE', 'Record expenses'),
  ('CAN_VIEW_REPORTS', 'View financial reports'),
  ('CAN_MANAGE_STAFF', 'Manage staff members and roles'),
  ('CAN_MANAGE_INVENTORY', 'Manage inventory items'),
  ('CAN_MANAGE_STUDENTS', 'Add, edit, and manage students'),
  ('CAN_MANAGE_CONFIG', 'Manage system configuration'),
  ('CAN_VIEW_AUDIT_LOG', 'View audit logs');

INSERT INTO roles (name) VALUES
  ('Admin'),
  ('Principal'),
  ('HR'),
  ('Faculty'),
  ('Lab Assistant'),
  ('Receptionist'),
  ('Librarian'),
  ('Clerk'),
  ('Security Guard'),
  ('Driver'),
  ('Housekeeping');

-- Grant all permissions to Admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Admin';

-- Principal: all except config
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Principal'
  AND p.code IN ('CAN_COLLECT_FEES', 'CAN_ADD_EXPENSE', 'CAN_VIEW_REPORTS', 'CAN_MANAGE_STAFF', 'CAN_MANAGE_STUDENTS', 'CAN_VIEW_AUDIT_LOG');

-- HR: staff & reports
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'HR'
  AND p.code IN ('CAN_MANAGE_STAFF', 'CAN_VIEW_REPORTS', 'CAN_VIEW_AUDIT_LOG');

-- Faculty: students only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Faculty'
  AND p.code IN ('CAN_MANAGE_STUDENTS', 'CAN_VIEW_REPORTS');

-- Receptionist: fees & students
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Receptionist'
  AND p.code IN ('CAN_COLLECT_FEES', 'CAN_MANAGE_STUDENTS');

-- Clerk: fees, expenses, reports
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Clerk'
  AND p.code IN ('CAN_COLLECT_FEES', 'CAN_ADD_EXPENSE', 'CAN_VIEW_REPORTS');

-- Librarian: inventory only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Librarian'
  AND p.code IN ('CAN_MANAGE_INVENTORY');

-- =============================================
-- SEED DATA: Default Accounts
-- =============================================

INSERT INTO accounts (name, is_online) VALUES
  ('Cash', FALSE),
  ('UPI', TRUE),
  ('Bank', TRUE);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reason_tags ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all data (access controlled at app level via RBAC)
CREATE POLICY "Authenticated users can read" ON students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON students FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON students FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read" ON staff FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON staff FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON staff FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read" ON fee_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON fee_configs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON fee_configs FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read" ON fee_heads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON fee_heads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON fee_heads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON fee_heads FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read" ON fee_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON fee_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete" ON fee_transactions FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read" ON accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON accounts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON accounts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON accounts FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read" ON account_adjustments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON account_adjustments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can read" ON inventory_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON inventory_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON inventory_items FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read" ON inventory_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON inventory_transactions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can read" ON expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete" ON expenses FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read" ON audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can read" ON roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON roles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON roles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON roles FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated users can read" ON permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read" ON role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON role_permissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON role_permissions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON role_permissions FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read" ON salary_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON salary_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete" ON salary_payments FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read" ON reason_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON reason_tags FOR INSERT TO authenticated WITH CHECK (true);

-- =============================================
-- AUTO-LINK AUTH USERS TO STAFF
-- The FIRST auth user created becomes Admin automatically.
-- Subsequent auth users are ignored here — they must be added via the
-- Staff page in the app (which creates both the auth user and staff row
-- through the service role).
--
-- To bootstrap: Dashboard -> Authentication -> Users -> Add user
--   email: admin@school.com, password: Admin@123, tick Auto Confirm.
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
BEGIN
  IF EXISTS (SELECT 1 FROM public.staff) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.staff (user_id, name, email, role_id, salary, is_active)
  VALUES (
    NEW.id,
    'Admin',
    NEW.email,
    (SELECT id FROM public.roles WHERE name = 'Admin' LIMIT 1),
    0,
    TRUE
  );

  RETURN NEW;
END;
$func$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
