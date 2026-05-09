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

export const createStudentSchema = z.object({
  admission_no: z
    .string()
    .max(50, "Admission number must be 50 characters or fewer")
    .trim(),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer")
    .trim(),
  grade: z.enum(GRADE_VALUES, { message: "Select a valid grade" }),
  section: z.enum(SECTION_VALUES, { message: "Select a valid section" }),
  status: z.enum(STUDENT_STATUS_VALUES, { message: "Select a valid status" }),
  parent_name: z
    .string()
    .max(100, "Parent name must be 100 characters or fewer")
    .trim(),
  parent_phone: z
    .string()
    .max(20, "Phone number must be 20 characters or fewer")
    .trim()
    .refine(
      (val) => val === "" || /^[+\d\s\-()]{7,20}$/.test(val),
      "Enter a valid phone number"
    ),
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
