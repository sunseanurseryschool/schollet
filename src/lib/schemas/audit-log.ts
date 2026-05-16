import { z } from "zod";

export const AUDIT_ACTION_VALUES = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "DEACTIVATE",
  "FEE_COLLECT",
  "PROCESS_SALARY",
  "CREATE_ACCOUNT",
  "UPDATE_ACCOUNT",
  "DELETE_ACCOUNT",
  "ADJUST_ACCOUNT",
  "INVENTORY_IN",
  "INVENTORY_OUT",
] as const;

export const AUDIT_ENTITY_VALUES = [
  "student",
  "fee_config",
  "fee_transaction",
  "expense",
  "account",
  "salary_payment",
  "staff",
  "role",
  "inventory_item",
  "inventory_transaction",
] as const;

export const auditLogListQuerySchema = z.object({
  entity: z.enum(AUDIT_ENTITY_VALUES).optional(),
  action: z.enum(AUDIT_ACTION_VALUES).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
});

export type AuditLogListQuery = z.infer<typeof auditLogListQuerySchema>;
