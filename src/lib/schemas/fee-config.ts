import { z } from "zod";
import { GRADE_VALUES } from "@/lib/schemas/student";

export const feeHeadInputSchema = z.object({
  name: z
    .string()
    .min(1, "Fee head name is required")
    .max(100, "Fee head name must be 100 characters or fewer")
    .trim(),
  amount: z
    .number({ message: "Amount must be a number" })
    .positive("Amount must be greater than zero")
    .multipleOf(0.01, "Amount can have at most 2 decimal places"),
});

export const createFeeConfigSchema = z
  .object({
    grade: z.enum(GRADE_VALUES, { message: "Select a valid grade" }),
    academic_year: z
      .string()
      .min(1, "Academic year is required")
      .max(20, "Academic year must be 20 characters or fewer")
      .trim()
      .regex(
        /^\d{4}-\d{4}$/,
        "Academic year must be in YYYY-YYYY format (e.g. 2024-2025)"
      ),
    total_fee: z
      .number({ message: "Total fee must be a number" })
      .positive("Total fee must be greater than zero")
      .multipleOf(0.01, "Total fee can have at most 2 decimal places"),
    fee_heads: z
      .array(feeHeadInputSchema)
      .min(1, "At least one fee head is required"),
  })
  .superRefine((data, ctx) => {
    const headSum = data.fee_heads.reduce((acc, h) => acc + h.amount, 0);
    // Use rounding to avoid floating-point drift
    const sumRounded = Math.round(headSum * 100) / 100;
    const totalRounded = Math.round(data.total_fee * 100) / 100;
    if (sumRounded !== totalRounded) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["total_fee"],
        message: `Total fee (${totalRounded}) must equal the sum of all fee heads (${sumRounded})`,
      });
    }
  });

export const updateFeeConfigSchema = createFeeConfigSchema;

export const feeConfigListQuerySchema = z.object({
  academic_year: z
    .string()
    .max(20)
    .trim()
    .regex(/^\d{4}-\d{4}$/, "Academic year must be in YYYY-YYYY format")
    .optional(),
});

export type FeeHeadInput = z.infer<typeof feeHeadInputSchema>;
export type CreateFeeConfigInput = z.infer<typeof createFeeConfigSchema>;
export type UpdateFeeConfigInput = z.infer<typeof updateFeeConfigSchema>;
export type FeeConfigListQuery = z.infer<typeof feeConfigListQuerySchema>;
