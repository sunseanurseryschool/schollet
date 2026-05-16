import { describe, it, expect } from "vitest";
import {
  createAccountSchema,
  updateAccountSchema,
} from "@/lib/schemas/account";

describe("createAccountSchema", () => {
  it("accepts a valid account", () => {
    const result = createAccountSchema.safeParse({
      name: "Cash",
      is_online: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = createAccountSchema.safeParse({
      name: "",
      is_online: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an excessively long name", () => {
    const result = createAccountSchema.safeParse({
      name: "x".repeat(81),
      is_online: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing is_online flag", () => {
    const result = createAccountSchema.safeParse({ name: "Cash" });
    expect(result.success).toBe(false);
  });
});

describe("updateAccountSchema", () => {
  it("accepts a partial update with only name", () => {
    const result = updateAccountSchema.safeParse({ name: "UPI" });
    expect(result.success).toBe(true);
  });

  it("accepts a partial update with only is_online", () => {
    const result = updateAccountSchema.safeParse({ is_online: true });
    expect(result.success).toBe(true);
  });

  it("accepts an empty patch", () => {
    const result = updateAccountSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
