import { z } from "zod";

export const createRoleSchema = z.object({
  name: z
    .string()
    .min(1, "Role name is required")
    .max(100, "Role name must be 100 characters or fewer")
    .trim(),
  permission_ids: z.array(z.string()).default([]),
});

export const updateRoleSchema = z.object({
  name: z
    .string()
    .min(1, "Role name is required")
    .max(100, "Role name must be 100 characters or fewer")
    .trim()
    .optional(),
  permission_ids: z.array(z.string()).optional(),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
