import { z } from "zod";

export const createInventoryItemSchema = z.object({
  name: z
    .string()
    .min(1, "Item name is required")
    .max(200, "Name must be 200 characters or fewer")
    .trim(),
  unit: z
    .string()
    .min(1, "Unit is required")
    .max(50, "Unit must be 50 characters or fewer")
    .trim(),
  min_quantity: z
    .number({ message: "Min quantity must be a number" })
    .int("Min quantity must be a whole number")
    .min(0, "Min quantity cannot be negative"),
  initial_quantity: z
    .number({ message: "Initial quantity must be a number" })
    .int("Initial quantity must be a whole number")
    .min(0, "Initial quantity cannot be negative"),
});

export const updateInventoryItemSchema = z.object({
  name: z
    .string()
    .min(1, "Item name is required")
    .max(200, "Name must be 200 characters or fewer")
    .trim()
    .optional(),
  unit: z
    .string()
    .min(1, "Unit is required")
    .max(50, "Unit must be 50 characters or fewer")
    .trim()
    .optional(),
  min_quantity: z
    .number({ message: "Min quantity must be a number" })
    .int("Min quantity must be a whole number")
    .min(0, "Min quantity cannot be negative")
    .optional(),
});

export const createInventoryTransactionSchema = z.object({
  type: z.enum(["IN", "OUT"], { message: "Type must be IN or OUT" }),
  quantity: z
    .number({ message: "Quantity must be a number" })
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1"),
  description: z
    .string()
    .max(500, "Description must be 500 characters or fewer")
    .trim(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  // For IN transactions that are purchases — triggers ledger journal entry
  is_purchase: z.boolean(),
  amount: z
    .number({ message: "Amount must be a number" })
    .min(0, "Amount cannot be negative")
    .optional(),
});

export const inventoryListQuerySchema = z.object({
  low_stock: z
    .string()
    .transform((v) => v === "true")
    .pipe(z.boolean())
    .optional(),
});

export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;
export type CreateInventoryTransactionInput = z.infer<
  typeof createInventoryTransactionSchema
>;
export type InventoryListQuery = z.infer<typeof inventoryListQuerySchema>;
