import { z } from "zod";
import { GRADE_VALUES, SECTION_VALUES } from "@/lib/schemas/student";

export const academicYearSchema = z
  .string()
  .regex(/^\d{4}-\d{4}$/, "Academic year must be in YYYY-YYYY format")
  .optional();

export const feeDuesQuerySchema = z.object({
  grade: z.enum(GRADE_VALUES).optional(),
  section: z.enum(SECTION_VALUES).optional(),
  academic_year: academicYearSchema,
});

export const feeDuesSummaryQuerySchema = z.object({
  academic_year: academicYearSchema,
});

export type FeeDuesQuery = z.infer<typeof feeDuesQuerySchema>;
export type FeeDuesSummaryQuery = z.infer<typeof feeDuesSummaryQuerySchema>;
