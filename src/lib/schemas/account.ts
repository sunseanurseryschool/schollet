import { z } from "zod";

export const ACCOUNT_TYPE_VALUES = [
  "INCOME",
  "EXPENSE",
  "ASSET",
  "LIABILITY",
] as const;

export const accountListQuerySchema = z.object({
  type: z.enum(ACCOUNT_TYPE_VALUES, { message: "Select a valid account type" }).optional(),
});

export type AccountListQuery = z.infer<typeof accountListQuerySchema>;

export const setOpeningBalanceSchema = z.object({
  accountId: z.string().uuid("accountId must be a valid UUID"),
  amount: z
    .number()
    .positive("Amount must be greater than zero")
    .finite("Amount must be a finite number"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
});

export type SetOpeningBalanceInput = z.infer<typeof setOpeningBalanceSchema>;
