import { z } from "zod";

export const createStaffSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer")
    .trim(),
  email: z
    .string()
    .min(1, "Email is required")
    .max(255, "Email must be 255 characters or fewer")
    .trim()
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(72, "Password must be 72 characters or fewer"),
  role_id: z.string().min(1, "Role is required"),
});

export const updateStaffSchema = createStaffSchema.omit({ password: true }).partial().extend({
  is_active: z.boolean().optional(),
  password: z
    .string()
    .max(72, "Password must be 72 characters or fewer")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))
    .refine((v) => !v || v.length >= 6, "Password must be at least 6 characters"),
});

export const staffListQuerySchema = z.object({
  role_id: z.string().optional(),
  is_active: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  search: z.string().max(100).trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type StaffListQuery = z.infer<typeof staffListQuerySchema>;
