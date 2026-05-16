import { z } from "zod";

export const GRADE_VALUES = [
  "PreKG",
  "LKG",
  "UKG",
  "1",
  "2",
  "3",
  "4",
  "5",
] as const;

export const SECTION_VALUES = ["A", "B", "C"] as const;

export const STUDENT_STATUS_VALUES = [
  "active",
  "inactive",
  "transferred",
] as const;

export const GENDER_VALUES = ["male", "female", "other"] as const;

export const BLOOD_GROUP_VALUES = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
  "unknown",
] as const;

const PHONE_REGEX = /^[+\d\s\-()]{7,20}$/;
const AADHAAR_REGEX = /^\d{12}$/;
const PIN_REGEX = /^\d{6}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const optionalText = (max: number, label: string) =>
  z
    .string()
    .max(max, `${label} must be ${max} characters or fewer`)
    .trim()
    .optional();

const optionalPhone = z
  .string()
  .trim()
  .max(20, "Phone number must be 20 characters or fewer")
  .refine(
    (val) => val === "" || PHONE_REGEX.test(val),
    "Enter a valid phone number",
  )
  .optional();

const optionalEmail = z
  .string()
  .trim()
  .max(120, "Email must be 120 characters or fewer")
  .refine(
    (val) => val === "" || EMAIL_REGEX.test(val),
    "Enter a valid email address",
  )
  .optional();

const optionalAadhaar = z
  .string()
  .trim()
  .refine(
    (val) => val === "" || AADHAAR_REGEX.test(val),
    "Aadhaar must be 12 digits",
  )
  .optional();

const optionalPin = z
  .string()
  .trim()
  .refine(
    (val) => val === "" || PIN_REGEX.test(val),
    "PIN code must be 6 digits",
  )
  .optional();

const optionalDate = z
  .string()
  .trim()
  .refine(
    (val) => val === "" || DATE_REGEX.test(val),
    "Date must be YYYY-MM-DD",
  )
  .optional();

// Income: form sends a number or NaN (RHF + valueAsNumber).
// We accept number, NaN, undefined, or null and let the API normalize.
const optionalIncome = z
  .number({ message: "Income must be a number" })
  .min(0, "Income cannot be negative")
  .nullable()
  .or(z.nan())
  .optional();

// Nullable enum: accepts either an enum value or empty string (form's "unset" state).
const optionalEnumString = <T extends readonly [string, ...string[]]>(
  values: T,
  message: string,
) =>
  z
    .enum(values, { message })
    .or(z.literal(""))
    .optional();

export const createStudentSchema = z.object({
  // Identifier (optional — service auto-generates if blank)
  admission_no: optionalText(50, "Admission number"),

  // ─── Required ─────────────────────────────────────────────────────────

  // Basic
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer")
    .trim(),
  gender: optionalEnumString(GENDER_VALUES, "Select a valid gender"),
  date_of_birth: optionalDate,
  blood_group: optionalEnumString(BLOOD_GROUP_VALUES, "Select a valid blood group"),
  nationality: optionalText(60, "Nationality"),
  religion: optionalText(60, "Religion"),
  community: optionalText(60, "Community"),
  caste: optionalText(60, "Caste"),
  aadhaar_no: optionalAadhaar,
  grade: z.enum(GRADE_VALUES, { message: "Select a valid grade" }),
  section: z.enum(SECTION_VALUES, { message: "Select a valid section" }),
  status: z.enum(STUDENT_STATUS_VALUES, { message: "Select a valid status" }),
  // Father
  father_name: optionalText(100, "Father name"),
  father_occupation: optionalText(100, "Occupation"),
  father_company: optionalText(120, "Company"),
  father_mobile: optionalPhone,
  father_email: optionalEmail,
  father_annual_income: optionalIncome,
  // Mother
  mother_name: optionalText(100, "Mother name"),
  mother_occupation: optionalText(100, "Occupation"),
  mother_company: optionalText(120, "Company"),
  mother_mobile: optionalPhone,
  mother_email: optionalEmail,
  mother_annual_income: optionalIncome,
  // Guardian
  guardian_name: optionalText(100, "Guardian name"),
  guardian_relationship: optionalText(60, "Relationship"),
  guardian_mobile: optionalPhone,
  guardian_address: optionalText(500, "Guardian address"),
  // Address & contact
  address_line: optionalText(500, "Address"),
  city: optionalText(80, "City"),
  state: optionalText(80, "State"),
  pin_code: optionalPin,
  emergency_contact: optionalPhone,
  alternate_phone: optionalPhone,
});

export const updateStudentSchema = createStudentSchema.partial().extend({
  status: z.enum(STUDENT_STATUS_VALUES).optional(),
});

export const studentListQuerySchema = z.object({
  grade: z.enum(GRADE_VALUES).optional(),
  section: z.enum(SECTION_VALUES).optional(),
  status: z.enum(STUDENT_STATUS_VALUES).optional(),
  search: z.string().max(100).trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type StudentListQuery = z.infer<typeof studentListQuerySchema>;

/**
 * Normalize form values for the DB:
 *   "" → null on nullable enum/text columns
 *   NaN/undefined → null on numeric columns
 *
 * Used by the form submit handler before POST/PUT.
 */
export function normalizeStudentForSubmit(
  input: CreateStudentInput,
): Record<string, unknown> {
  const blank = (v: unknown) => (v === "" || v == null ? null : v);
  const num = (v: unknown) =>
    v == null || (typeof v === "number" && Number.isNaN(v)) ? null : v;
  return {
    admission_no: input.admission_no,
    name: input.name,
    gender: blank(input.gender),
    date_of_birth: blank(input.date_of_birth),
    blood_group: blank(input.blood_group),
    nationality: blank(input.nationality),
    religion: blank(input.religion),
    community: blank(input.community),
    caste: blank(input.caste),
    aadhaar_no: blank(input.aadhaar_no),
    grade: input.grade,
    section: input.section,
    status: input.status,
    father_name: blank(input.father_name),
    father_occupation: blank(input.father_occupation),
    father_company: blank(input.father_company),
    father_mobile: blank(input.father_mobile),
    father_email: blank(input.father_email),
    father_annual_income: num(input.father_annual_income),
    mother_name: blank(input.mother_name),
    mother_occupation: blank(input.mother_occupation),
    mother_company: blank(input.mother_company),
    mother_mobile: blank(input.mother_mobile),
    mother_email: blank(input.mother_email),
    mother_annual_income: num(input.mother_annual_income),
    guardian_name: blank(input.guardian_name),
    guardian_relationship: blank(input.guardian_relationship),
    guardian_mobile: blank(input.guardian_mobile),
    guardian_address: blank(input.guardian_address),
    address_line: blank(input.address_line),
    city: blank(input.city),
    state: blank(input.state),
    pin_code: blank(input.pin_code),
    emergency_contact: blank(input.emergency_contact),
    alternate_phone: blank(input.alternate_phone),
  };
}
