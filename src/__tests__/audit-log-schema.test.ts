import { describe, it, expect } from "vitest";
import { auditLogListQuerySchema, AUDIT_ACTION_VALUES } from "@/lib/schemas/audit-log";

describe("auditLogListQuerySchema", () => {
  it("accepts empty query with defaults", () => {
    const result = auditLogListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.per_page).toBe(25);
      expect(result.data.entity).toBeUndefined();
      expect(result.data.action).toBeUndefined();
      expect(result.data.date_from).toBeUndefined();
      expect(result.data.date_to).toBeUndefined();
    }
  });

  it("accepts all valid action values", () => {
    for (const action of AUDIT_ACTION_VALUES) {
      const result = auditLogListQuerySchema.safeParse({ action });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid action value", () => {
    const result = auditLogListQuerySchema.safeParse({ action: "READ" });
    expect(result.success).toBe(false);
  });

  it("accepts all valid entity values", () => {
    const entities = [
      "student",
      "fee_config",
      "fee_transaction",
      "expense",
      "account",
      "staff",
      "role",
      "inventory_item",
      "inventory_transaction",
    ] as const;
    for (const entity of entities) {
      const result = auditLogListQuerySchema.safeParse({ entity });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid entity value", () => {
    const result = auditLogListQuerySchema.safeParse({ entity: "unknown_entity" });
    expect(result.success).toBe(false);
  });

  it("coerces page and per_page from strings", () => {
    const result = auditLogListQuerySchema.safeParse({
      page: "3",
      per_page: "50",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.per_page).toBe(50);
    }
  });

  it("rejects page less than 1", () => {
    const result = auditLogListQuerySchema.safeParse({ page: "0" });
    expect(result.success).toBe(false);
  });

  it("rejects per_page greater than 100", () => {
    const result = auditLogListQuerySchema.safeParse({ per_page: "101" });
    expect(result.success).toBe(false);
  });

  it("accepts date_from and date_to as strings", () => {
    const result = auditLogListQuerySchema.safeParse({
      date_from: "2026-01-01",
      date_to: "2026-12-31",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.date_from).toBe("2026-01-01");
      expect(result.data.date_to).toBe("2026-12-31");
    }
  });

  it("accepts all filters combined", () => {
    const result = auditLogListQuerySchema.safeParse({
      entity: "student",
      action: "CREATE",
      date_from: "2026-04-01",
      date_to: "2026-04-14",
      page: "2",
      per_page: "10",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entity).toBe("student");
      expect(result.data.action).toBe("CREATE");
      expect(result.data.page).toBe(2);
      expect(result.data.per_page).toBe(10);
    }
  });

  it("strips unknown extra fields", () => {
    const result = auditLogListQuerySchema.safeParse({
      entity: "expense",
      extra_field: "should_be_stripped",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("extra_field" in result.data).toBe(false);
    }
  });
});
