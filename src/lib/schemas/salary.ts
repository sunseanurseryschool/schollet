import { z } from "zod";

const MONTH_REGEX = /^\d{4}-\d{2}$/;

export const processSalarySchema = z.object({
  staff_id: z.string().min(1, "Staff ID is required"),
  account_id: z.string().uuid("Select a valid account"),
  month: z
    .string()
    .regex(MONTH_REGEX, "Month must be in YYYY-MM format"),
  amount: z
    .number({ message: "Amount is required" })
    .positive("Amount must be greater than zero")
    .multipleOf(0.01, "Amount must have at most 2 decimal places"),
  notes: z.string().max(500, "Notes must be 500 characters or fewer").optional(),
  payment_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Payment date must be YYYY-MM-DD format")
    .optional(),
});

export const bulkSalarySchema = z.object({
  account_id: z.string().uuid("Select a valid account"),
  month: z
    .string()
    .regex(MONTH_REGEX, "Month must be in YYYY-MM format"),
  payment_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Payment date must be YYYY-MM-DD format")
    .optional(),
});

export const salaryListQuerySchema = z.object({
  month: z
    .string()
    .regex(MONTH_REGEX, "Month must be in YYYY-MM format")
    .optional(),
  staff_id: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(50),
});

export type ProcessSalaryInput = z.infer<typeof processSalarySchema>;
export type BulkSalaryInput = z.infer<typeof bulkSalarySchema>;
export type SalaryListQuery = z.infer<typeof salaryListQuerySchema>;
