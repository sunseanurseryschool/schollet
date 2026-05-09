import { describe, it, expect } from "vitest";
import {
  createInventoryItemSchema,
  updateInventoryItemSchema,
  createInventoryTransactionSchema,
  inventoryListQuerySchema,
} from "@/lib/schemas/inventory";

// ─── createInventoryItemSchema ────────────────────────────────────────────────

describe("createInventoryItemSchema", () => {
  const valid = {
    name: "A4 Paper Ream",
    unit: "reams",
    min_quantity: 5,
    initial_quantity: 20,
  };

  it("accepts a valid payload", () => {
    expect(createInventoryItemSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createInventoryItemSchema.safeParse({ ...valid, name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const field = result.error.flatten().fieldErrors.name;
      expect(field).toBeDefined();
    }
  });

  it("rejects name over 200 characters", () => {
    const result = createInventoryItemSchema.safeParse({
      ...valid,
      name: "x".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("trims whitespace from name", () => {
    const result = createInventoryItemSchema.safeParse({
      ...valid,
      name: "  Chalk Box  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Chalk Box");
    }
  });

  it("rejects negative min_quantity", () => {
    const result = createInventoryItemSchema.safeParse({
      ...valid,
      min_quantity: -1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts zero for min_quantity", () => {
    expect(
      createInventoryItemSchema.safeParse({ ...valid, min_quantity: 0 }).success
    ).toBe(true);
  });

  it("rejects negative initial_quantity", () => {
    expect(
      createInventoryItemSchema.safeParse({ ...valid, initial_quantity: -5 })
        .success
    ).toBe(false);
  });

  it("rejects non-integer min_quantity", () => {
    const result = createInventoryItemSchema.safeParse({
      ...valid,
      min_quantity: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer initial_quantity", () => {
    const result = createInventoryItemSchema.safeParse({
      ...valid,
      initial_quantity: 2.7,
    });
    expect(result.success).toBe(false);
  });
});

// ─── updateInventoryItemSchema ────────────────────────────────────────────────

describe("updateInventoryItemSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    expect(updateInventoryItemSchema.safeParse({}).success).toBe(true);
  });

  it("accepts partial update with only name", () => {
    expect(
      updateInventoryItemSchema.safeParse({ name: "New Name" }).success
    ).toBe(true);
  });

  it("rejects empty name when name is provided", () => {
    const result = updateInventoryItemSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects negative min_quantity when provided", () => {
    const result = updateInventoryItemSchema.safeParse({ min_quantity: -1 });
    expect(result.success).toBe(false);
  });
});

// ─── createInventoryTransactionSchema ────────────────────────────────────────

describe("createInventoryTransactionSchema", () => {
  const validIn = {
    type: "IN" as const,
    quantity: 10,
    description: "Restocked",
    date: "2026-04-14",
    is_purchase: false,
  };

  const validOut = {
    type: "OUT" as const,
    quantity: 3,
    description: "Used for exam",
    date: "2026-04-14",
    is_purchase: false,
  };

  it("accepts valid IN transaction", () => {
    expect(createInventoryTransactionSchema.safeParse(validIn).success).toBe(
      true
    );
  });

  it("accepts valid OUT transaction", () => {
    expect(createInventoryTransactionSchema.safeParse(validOut).success).toBe(
      true
    );
  });

  it("accepts IN purchase with amount", () => {
    const result = createInventoryTransactionSchema.safeParse({
      ...validIn,
      is_purchase: true,
      amount: 1500.0,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(1500.0);
      expect(result.data.is_purchase).toBe(true);
    }
  });

  it("rejects invalid type value", () => {
    const result = createInventoryTransactionSchema.safeParse({
      ...validIn,
      type: "INBOUND",
    });
    expect(result.success).toBe(false);
  });

  it("rejects quantity of 0", () => {
    const result = createInventoryTransactionSchema.safeParse({
      ...validIn,
      quantity: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative quantity", () => {
    const result = createInventoryTransactionSchema.safeParse({
      ...validIn,
      quantity: -5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer quantity", () => {
    const result = createInventoryTransactionSchema.safeParse({
      ...validIn,
      quantity: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects malformed date", () => {
    const result = createInventoryTransactionSchema.safeParse({
      ...validIn,
      date: "14-04-2026",
    });
    expect(result.success).toBe(false);
  });

  it("rejects date with wrong format", () => {
    const result = createInventoryTransactionSchema.safeParse({
      ...validIn,
      date: "2026/04/14",
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty description", () => {
    const result = createInventoryTransactionSchema.safeParse({
      ...validIn,
      description: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects description over 500 characters", () => {
    const result = createInventoryTransactionSchema.safeParse({
      ...validIn,
      description: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative amount", () => {
    const result = createInventoryTransactionSchema.safeParse({
      ...validIn,
      is_purchase: true,
      amount: -100,
    });
    expect(result.success).toBe(false);
  });

  it("accepts zero amount (purchase with no cost recorded)", () => {
    const result = createInventoryTransactionSchema.safeParse({
      ...validIn,
      is_purchase: true,
      amount: 0,
    });
    expect(result.success).toBe(true);
  });

  it("amount is optional when is_purchase is false", () => {
    const result = createInventoryTransactionSchema.safeParse({
      ...validIn,
      is_purchase: false,
      // amount omitted
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBeUndefined();
    }
  });
});

// ─── inventoryListQuerySchema ─────────────────────────────────────────────────

describe("inventoryListQuerySchema", () => {
  it("accepts empty query", () => {
    expect(inventoryListQuerySchema.safeParse({}).success).toBe(true);
  });

  it("transforms low_stock=true string to boolean true", () => {
    const result = inventoryListQuerySchema.safeParse({ low_stock: "true" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.low_stock).toBe(true);
    }
  });

  it("transforms low_stock=false string to boolean false", () => {
    const result = inventoryListQuerySchema.safeParse({ low_stock: "false" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.low_stock).toBe(false);
    }
  });

  it("omits low_stock when not provided", () => {
    const result = inventoryListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.low_stock).toBeUndefined();
    }
  });
});

// ─── Low-stock detection logic (pure unit test) ───────────────────────────────

describe("low-stock detection logic", () => {
  function isLowStock(quantity: number, minQuantity: number): boolean {
    return quantity <= minQuantity;
  }

  it("flags item as low when quantity equals min_quantity", () => {
    expect(isLowStock(5, 5)).toBe(true);
  });

  it("flags item as low when quantity is below min_quantity", () => {
    expect(isLowStock(3, 5)).toBe(true);
  });

  it("does not flag item when quantity exceeds min_quantity", () => {
    expect(isLowStock(10, 5)).toBe(false);
  });

  it("flags item as low when min_quantity is 0 and quantity is 0", () => {
    expect(isLowStock(0, 0)).toBe(true);
  });

  it("does not flag item with positive stock when min_quantity is 0", () => {
    expect(isLowStock(1, 0)).toBe(false);
  });
});

// ─── Stock movement quantity calculation ─────────────────────────────────────

describe("stock movement quantity calculation", () => {
  function computeNewQuantity(
    current: number,
    type: "IN" | "OUT",
    delta: number
  ): { newQty: number } | { error: string } {
    if (type === "IN") {
      return { newQty: current + delta };
    }
    if (delta > current) {
      return {
        error: `Insufficient stock. Available: ${current}, Requested: ${delta}`,
      };
    }
    return { newQty: current - delta };
  }

  it("IN increases quantity correctly", () => {
    const result = computeNewQuantity(10, "IN", 5);
    expect(result).toEqual({ newQty: 15 });
  });

  it("OUT decreases quantity correctly", () => {
    const result = computeNewQuantity(10, "OUT", 3);
    expect(result).toEqual({ newQty: 7 });
  });

  it("OUT to zero is allowed", () => {
    const result = computeNewQuantity(5, "OUT", 5);
    expect(result).toEqual({ newQty: 0 });
  });

  it("OUT fails when requested exceeds current stock", () => {
    const result = computeNewQuantity(3, "OUT", 5);
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("Insufficient stock");
    }
  });

  it("OUT of zero stock fails", () => {
    const result = computeNewQuantity(0, "OUT", 1);
    expect("error" in result).toBe(true);
  });
});
