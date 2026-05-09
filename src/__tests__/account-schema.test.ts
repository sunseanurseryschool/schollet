import { describe, it, expect } from "vitest";
import { accountListQuerySchema } from "@/lib/schemas/account";

describe("accountListQuerySchema", () => {
  it("accepts empty query", () => {
    const result = accountListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts valid type filter", () => {
    const types = ["INCOME", "EXPENSE", "ASSET", "LIABILITY"] as const;
    for (const type of types) {
      const result = accountListQuerySchema.safeParse({ type });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid type value", () => {
    const result = accountListQuerySchema.safeParse({ type: "DEBIT" });
    expect(result.success).toBe(false);
  });

  it("ignores unknown extra fields (strip behavior)", () => {
    const result = accountListQuerySchema.safeParse({
      type: "ASSET",
      unknown_field: "should_be_stripped",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("unknown_field" in result.data).toBe(false);
    }
  });
});
