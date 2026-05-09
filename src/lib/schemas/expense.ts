import { z } from "zod";

export const EXPENSE_CATEGORY_VALUES = [
  "Utilities",
  "Maintenance",
  "Supplies",
  "Transport",
  "Inventory",
  "Salary",
  "Rent",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORY_VALUES)[number];

export const createExpenseSchema = z.object({
  amount: z
    .number({ message: "Amount is required" })
    .positive("Amount must be greater than zero")
    .multipleOf(0.01, "Amount must have at most 2 decimal places"),
  category: z.enum(EXPENSE_CATEGORY_VALUES, {
    message: "Select a valid category",
  }),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be 500 characters or fewer")
    .trim(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  isInventory: z.boolean().optional(),
});

export const expenseListQuerySchema = z.object({
  date_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date_from must be YYYY-MM-DD")
    .optional(),
  date_to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date_to must be YYYY-MM-DD")
    .optional(),
  category: z.enum(EXPENSE_CATEGORY_VALUES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type ExpenseListQuery = z.infer<typeof expenseListQuerySchema>;
