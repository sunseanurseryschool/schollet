import { z } from "zod";
import { GRADE_VALUES, SECTION_VALUES } from "@/lib/schemas/student";
import { EXPENSE_CATEGORY_VALUES } from "@/lib/schemas/expense";

export const dateRangeSchema = z.object({
  date_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date_from must be YYYY-MM-DD"),
  date_to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date_to must be YYYY-MM-DD"),
});

export const incomeExpenseQuerySchema = dateRangeSchema;

export const profitLossQuerySchema = dateRangeSchema;

export const studentDuesQuerySchema = z.object({
  grade: z.enum(GRADE_VALUES).optional(),
  section: z.enum(SECTION_VALUES).optional(),
});

export const collectionQuerySchema = dateRangeSchema.extend({
  grade: z.enum(GRADE_VALUES).optional(),
  section: z.enum(SECTION_VALUES).optional(),
});

export const discountQuerySchema = dateRangeSchema;

// RPT-005: Expense report query schema
export const expenseReportQuerySchema = dateRangeSchema.extend({
  category: z.enum(EXPENSE_CATEGORY_VALUES).optional(),
});

// RPT-007: Salary report query schema — month is optional (YYYY-MM format)
export const salaryReportQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "month must be YYYY-MM")
    .optional(),
});

// RPT-008: Inventory report has no query params
export const inventoryReportQuerySchema = z.object({});

export type IncomeExpenseQuery = z.infer<typeof incomeExpenseQuerySchema>;
export type ProfitLossQuery = z.infer<typeof profitLossQuerySchema>;
export type StudentDuesQuery = z.infer<typeof studentDuesQuerySchema>;
export type CollectionQuery = z.infer<typeof collectionQuerySchema>;
export type DiscountQuery = z.infer<typeof discountQuerySchema>;
export type ExpenseReportQuery = z.infer<typeof expenseReportQuerySchema>;
export type SalaryReportQuery = z.infer<typeof salaryReportQuerySchema>;
export type InventoryReportQuery = z.infer<typeof inventoryReportQuerySchema>;
