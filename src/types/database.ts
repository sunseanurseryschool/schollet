// Core database types for Schollet

export type StudentStatus = "active" | "inactive" | "transferred";
export type Grade = "PreKG" | "LKG" | "UKG" | "1" | "2" | "3" | "4" | "5";
export type Section = "A" | "B" | "C";
export type AccountType = "INCOME" | "EXPENSE" | "ASSET" | "LIABILITY";
export type ReferenceType = "FEE" | "SALARY" | "EXPENSE" | "OPENING_BALANCE";
export type PaymentMode = "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE";
export type InventoryTransactionType = "IN" | "OUT";
export type ReasonTagType = "DISCOUNT" | "EXPENSE";

export interface Student {
  id: string;
  admission_no: string;
  name: string;
  grade: Grade;
  section: Section;
  status: StudentStatus;
  parent_name: string;
  parent_phone: string;
  created_at: string;
  updated_at: string;
}

export interface FeeConfig {
  id: string;
  grade: Grade;
  academic_year: string;
  total_fee: number;
  created_at: string;
}

export interface FeeHead {
  id: string;
  fee_config_id: string;
  name: string;
  amount: number;
}

export interface FeeTransaction {
  id: string;
  student_id: string;
  fee_config_id: string;
  total_fee: number;
  paid_amount: number;
  discount_amount: number;
  discount_reason: string | null;
  payment_mode: PaymentMode;
  received_by: string;
  receipt_no: string;
  payment_date: string;
  created_at: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  code: string;
  is_system: boolean;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  reference_type: ReferenceType;
  reference_id: string;
  description: string;
  created_at: string;
}

export interface JournalLine {
  id: string;
  journal_id: string;
  account_id: string;
  debit: number;
  credit: number;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  role_id: string;
  salary: number;
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
  created_at: string;
}

export interface Permission {
  id: string;
  code: string;
  description: string;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  min_quantity: number;
  created_at: string;
}

export interface InventoryTransaction {
  id: string;
  item_id: string;
  type: InventoryTransactionType;
  quantity: number;
  description: string;
  date: string;
  created_at: string;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  paid_by: string;
  date: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity: string;
  entity_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface ReasonTag {
  id: string;
  name: string;
  type: ReasonTagType;
}

export interface SalaryPayment {
  id: string;
  staff_id: string;
  amount: number;
  month: string;
  payment_date: string;
  notes: string;
  created_at: string;
}
