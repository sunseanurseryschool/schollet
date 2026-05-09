import { describe, it, expect } from "vitest";
import { createRoleSchema, updateRoleSchema } from "@/lib/schemas/role";

describe("createRoleSchema", () => {
  it("accepts valid role with permissions", () => {
    const result = createRoleSchema.safeParse({
      name: "Accountant",
      permission_ids: ["perm-id-1", "perm-id-2"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Accountant");
      expect(result.data.permission_ids).toHaveLength(2);
    }
  });

  it("accepts role with empty permissions array", () => {
    const result = createRoleSchema.safeParse({
      name: "Observer",
      permission_ids: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.permission_ids).toHaveLength(0);
    }
  });

  it("defaults permission_ids to empty array when omitted", () => {
    const result = createRoleSchema.safeParse({ name: "Observer" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.permission_ids).toEqual([]);
    }
  });

  it("rejects empty role name", () => {
    const result = createRoleSchema.safeParse({
      name: "",
      permission_ids: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      expect(fields.name).toBeDefined();
    }
  });

  it("rejects role name exceeding 100 characters", () => {
    const result = createRoleSchema.safeParse({
      name: "R".repeat(101),
      permission_ids: [],
    });
    expect(result.success).toBe(false);
  });

  it("trims whitespace from role name", () => {
    const result = createRoleSchema.safeParse({
      name: "  Admin  ",
      permission_ids: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Admin");
    }
  });

  it("rejects missing name field", () => {
    const result = createRoleSchema.safeParse({ permission_ids: [] });
    expect(result.success).toBe(false);
  });
});

describe("updateRoleSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    const result = updateRoleSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts name-only update", () => {
    const result = updateRoleSchema.safeParse({ name: "Senior Accountant" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Senior Accountant");
      expect(result.data.permission_ids).toBeUndefined();
    }
  });

  it("accepts permissions-only update", () => {
    const result = updateRoleSchema.safeParse({
      permission_ids: ["p-id-1"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.permission_ids).toEqual(["p-id-1"]);
      expect(result.data.name).toBeUndefined();
    }
  });

  it("accepts combined name + permissions update", () => {
    const result = updateRoleSchema.safeParse({
      name: "Bursar",
      permission_ids: ["p-id-1", "p-id-2"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Bursar");
      expect(result.data.permission_ids).toHaveLength(2);
    }
  });

  it("rejects empty name string when name is provided", () => {
    const result = updateRoleSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      expect(fields.name).toBeDefined();
    }
  });

  it("rejects name exceeding 100 characters", () => {
    const result = updateRoleSchema.safeParse({ name: "R".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("trims whitespace from name when provided", () => {
    const result = updateRoleSchema.safeParse({ name: "  Bursar  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Bursar");
    }
  });

  it("accepts empty permissions array (clear all permissions)", () => {
    const result = updateRoleSchema.safeParse({ permission_ids: [] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.permission_ids).toEqual([]);
    }
  });
});
