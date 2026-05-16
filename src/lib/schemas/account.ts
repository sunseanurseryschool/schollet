import { z } from "zod";

const nameSchema = z
  .string()
  .min(1, "Account name is required")
  .max(80, "Account name must be 80 characters or fewer")
  .trim();

export const createAccountSchema = z.object({
  name: nameSchema,
  is_online: z.boolean(),
});

export const updateAccountSchema = z.object({
  name: nameSchema.optional(),
  is_online: z.boolean().optional(),
});

export const ADJUSTMENT_TYPES = ["increase", "decrease"] as const;
export type AdjustmentType = (typeof ADJUSTMENT_TYPES)[number];

export const createAccountAdjustmentSchema = z.object({
  type: z.enum(ADJUSTMENT_TYPES, { message: "Select increase or decrease" }),
  amount: z
    .number({ message: "Amount must be a number" })
    .positive("Amount must be greater than zero")
    .multipleOf(0.01, "Amount can have at most 2 decimal places"),
  reason: z
    .string()
    .min(3, "Reason must be at least 3 characters")
    .max(500, "Reason must be 500 characters or fewer")
    .trim(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type CreateAccountAdjustmentInput = z.infer<
  typeof createAccountAdjustmentSchema
>;
