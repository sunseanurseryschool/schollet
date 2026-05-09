import { z } from "zod";

export const PAYMENT_MODE_VALUES = [
  "CASH",
  "UPI",
  "BANK_TRANSFER",
  "CHEQUE",
] as const;

export const collectFeeSchema = z
  .object({
    student_id: z.string().uuid("Invalid student ID"),
    fee_config_id: z.string().uuid("Invalid fee config ID"),
    paid_amount: z
      .number({ message: "Paid amount must be a number" })
      .positive("Paid amount must be greater than zero")
      .multipleOf(0.01, "Paid amount can have at most 2 decimal places"),
    discount_amount: z
      .number({ message: "Discount amount must be a number" })
      .min(0, "Discount amount cannot be negative")
      .multipleOf(0.01, "Discount amount can have at most 2 decimal places"),
    discount_reason: z
      .string()
      .max(500, "Discount reason must be 500 characters or fewer")
      .trim()
      .optional(),
    payment_mode: z.enum(PAYMENT_MODE_VALUES, {
      message: "Select a valid payment mode",
    }),
    payment_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Payment date must be YYYY-MM-DD")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.discount_amount > 0 && !data.discount_reason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["discount_reason"],
        message: "Discount reason is required when a discount is applied",
      });
    }
  });

export const feeHistoryQuerySchema = z.object({
  student_id: z.string().uuid("Invalid student ID"),
});

export const feeSummaryQuerySchema = z.object({
  student_id: z.string().uuid("Invalid student ID"),
  fee_config_id: z.string().uuid("Invalid fee config ID"),
});

export type CollectFeeInput = z.infer<typeof collectFeeSchema>;
export type FeeHistoryQuery = z.infer<typeof feeHistoryQuerySchema>;
export type FeeSummaryQuery = z.infer<typeof feeSummaryQuerySchema>;
