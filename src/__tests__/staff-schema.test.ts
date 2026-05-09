import { describe, it, expect } from "vitest";
import {
  createStaffSchema,
  updateStaffSchema,
  staffListQuerySchema,
} from "@/lib/schemas/staff";

describe("createStaffSchema", () => {
  const validInput = {
    name: "Alice Smith",
    email: "alice@school.edu",
    role_id: "some-role-id",
    salary: 35000,
  };

  it("accepts valid staff input", () => {
    const result = createStaffSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createStaffSchema.safeParse({ ...validInput, name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      expect(fields.name).toBeDefined();
    }
  });

  it("rejects invalid email", () => {
    const result = createStaffSchema.safeParse({
      ...validInput,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      expect(fields.email).toBeDefined();
    }
  });

  it("rejects empty email", () => {
    const result = createStaffSchema.safeParse({ ...validInput, email: "" });
    expect(result.success).toBe(false);
  });

  it("rejects empty role_id", () => {
    const result = createStaffSchema.safeParse({ ...validInput, role_id: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      expect(fields.role_id).toBeDefined();
    }
  });

  it("rejects negative salary", () => {
    const result = createStaffSchema.safeParse({ ...validInput, salary: -1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      expect(fields.salary).toBeDefined();
    }
  });

  it("accepts zero salary", () => {
    const result = createStaffSchema.safeParse({ ...validInput, salary: 0 });
    expect(result.success).toBe(true);
  });

  it("trims whitespace from name and email", () => {
    const result = createStaffSchema.safeParse({
      ...validInput,
      name: "  Alice Smith  ",
      email: "  alice@school.edu  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Alice Smith");
      expect(result.data.email).toBe("alice@school.edu");
    }
  });

  it("rejects name exceeding 100 characters", () => {
    const result = createStaffSchema.safeParse({
      ...validInput,
      name: "A".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects email exceeding 255 characters", () => {
    const local = "a".repeat(250);
    const result = createStaffSchema.safeParse({
      ...validInput,
      email: `${local}@x.com`,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateStaffSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    const result = updateStaffSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts partial update with only name", () => {
    const result = updateStaffSchema.safeParse({ name: "Bob Jones" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Bob Jones");
      expect(result.data.email).toBeUndefined();
    }
  });

  it("rejects invalid email even in partial update", () => {
    const result = updateStaffSchema.safeParse({ email: "bad-email" });
    expect(result.success).toBe(false);
  });

  it("rejects negative salary even in partial update", () => {
    const result = updateStaffSchema.safeParse({ salary: -500 });
    expect(result.success).toBe(false);
  });
});

describe("staffListQuerySchema", () => {
  it("accepts empty query with defaults", () => {
    const result = staffListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.per_page).toBe(50);
    }
  });

  it("transforms is_active string to boolean", () => {
    const trueResult = staffListQuerySchema.safeParse({ is_active: "true" });
    expect(trueResult.success).toBe(true);
    if (trueResult.success) {
      expect(trueResult.data.is_active).toBe(true);
    }

    const falseResult = staffListQuerySchema.safeParse({ is_active: "false" });
    expect(falseResult.success).toBe(true);
    if (falseResult.success) {
      expect(falseResult.data.is_active).toBe(false);
    }
  });

  it("rejects invalid is_active value", () => {
    const result = staffListQuerySchema.safeParse({ is_active: "yes" });
    expect(result.success).toBe(false);
  });

  it("coerces page and per_page from strings", () => {
    const result = staffListQuerySchema.safeParse({ page: "2", per_page: "25" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.per_page).toBe(25);
    }
  });

  it("rejects page less than 1", () => {
    const result = staffListQuerySchema.safeParse({ page: "0" });
    expect(result.success).toBe(false);
  });

  it("rejects per_page greater than 100", () => {
    const result = staffListQuerySchema.safeParse({ per_page: "200" });
    expect(result.success).toBe(false);
  });

  it("accepts optional role_id filter", () => {
    const result = staffListQuerySchema.safeParse({
      role_id: "test-role-id",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role_id).toBe("test-role-id");
    }
  });

  it("accepts optional search filter", () => {
    const result = staffListQuerySchema.safeParse({ search: "Alice" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBe("Alice");
    }
  });
});
