// Core database types for Schollet

export type StudentStatus = "active" | "inactive" | "transferred";
export type Grade = "PreKG" | "LKG" | "UKG" | "1" | "2" | "3" | "4" | "5";
export type Section = "A" | "B" | "C";
export type Gender = "male" | "female" | "other";
export type BloodGroup =
  | "A+"
  | "A-"
  | "B+"
  | "B-"
  | "AB+"
  | "AB-"
  | "O+"
  | "O-"
  | "unknown";
export type InventoryTransactionType = "IN" | "OUT";
export type ReasonTagType = "DISCOUNT" | "EXPENSE";

export interface Student {
  id: string;
  admission_no: string;
  // Basic
  name: string;
  gender: Gender | null;
  date_of_birth: string | null;
  blood_group: BloodGroup | null;
  nationality: string | null;
  religion: string | null;
  community: string | null;
  caste: string | null;
  aadhaar_no: string | null;
  grade: Grade;
  section: Section;
  status: StudentStatus;
  // Father
  father_name: string | null;
  father_occupation: string | null;
  father_company: string | null;
  father_mobile: string | null;
  father_email: string | null;
  father_annual_income: number | null;
  // Mother
  mother_name: string | null;
  mother_occupation: string | null;
  mother_company: string | null;
  mother_mobile: string | null;
  mother_email: string | null;
  mother_annual_income: number | null;
  // Guardian
  guardian_name: string | null;
  guardian_relationship: string | null;
  guardian_mobile: string | null;
  guardian_address: string | null;
  // Contact + Address
  address_line: string | null;
  city: string | null;
  state: string | null;
  pin_code: string | null;
  emergency_contact: string | null;
  alternate_phone: string | null;
  fee_config_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeeConfig {
  id: string;
  grade: Grade;
  academic_year: string;
  title: string;
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
  account_id: string;
  total_fee: number;
  paid_amount: number;
  discount_amount: number;
  discount_reason: string | null;
  received_by: string;
  receipt_no: string;
  payment_date: string;
  created_at: string;
}

export interface Account {
  id: string;
  name: string;
  is_online: boolean;
  created_at: string;
}

export interface AccountAdjustment {
  id: string;
  account_id: string;
  amount: number; // signed: positive = increase, negative = decrease
  reason: string;
  created_by: string;
  created_at: string;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  role_id: string;
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
  account_id: string | null;
  type: InventoryTransactionType;
  quantity: number;
  description: string;
  date: string;
  created_at: string;
}

export interface Expense {
  id: string;
  account_id: string;
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
