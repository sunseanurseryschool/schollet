import { z } from "zod";

export const REFERENCE_TYPE_VALUES = ["FEE", "SALARY", "EXPENSE", "OPENING_BALANCE"] as const;

export const journalLineInputSchema = z.object({
  account_id: z.string().uuid("account_id must be a valid UUID"),
  debit: z.number().min(0, "Debit must be non-negative"),
  credit: z.number().min(0, "Credit must be non-negative"),
});

export const createJournalEntrySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
    reference_type: z.enum(REFERENCE_TYPE_VALUES, {
      message: "Select a valid reference type",
    }),
    reference_id: z.string().uuid("reference_id must be a valid UUID"),
    description: z
      .string()
      .min(1, "Description is required")
      .max(255, "Description must be 255 characters or fewer")
      .trim(),
    lines: z
      .array(journalLineInputSchema)
      .min(2, "Journal entry must have at least 2 lines"),
  })
  .superRefine((data, ctx) => {
    // Each line must be debit-only or credit-only (mirrors DB constraint)
    for (let i = 0; i < data.lines.length; i++) {
      const line = data.lines[i];
      const hasDebit = line.debit > 0;
      const hasCredit = line.credit > 0;
      if (hasDebit && hasCredit) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lines", i],
          message: `Line ${i + 1}: a line cannot have both debit and credit`,
        });
      }
      if (!hasDebit && !hasCredit) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["lines", i],
          message: `Line ${i + 1}: a line must have either a debit or a credit`,
        });
      }
    }

    // Total debits must equal total credits
    const totalDebit = data.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = data.lines.reduce((sum, l) => sum + l.credit, 0);
    // Use rounding to avoid floating-point drift
    if (Math.round(totalDebit * 100) !== Math.round(totalCredit * 100)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lines"],
        message: `Journal entry is unbalanced: debits (${totalDebit}) ≠ credits (${totalCredit})`,
      });
    }
  });

export const journalListQuerySchema = z.object({
  reference_type: z
    .enum(REFERENCE_TYPE_VALUES, { message: "Select a valid reference type" })
    .optional(),
  date_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date_from must be YYYY-MM-DD")
    .optional(),
  date_to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date_to must be YYYY-MM-DD")
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(50),
});

export type JournalLineInput = z.infer<typeof journalLineInputSchema>;
export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;
export type JournalListQuery = z.infer<typeof journalListQuerySchema>;
