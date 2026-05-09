import { describe, it, expect } from "vitest";
import {
  processSalarySchema,
  bulkSalarySchema,
  salaryListQuerySchema,
} from "@/lib/schemas/salary";

// ─── processSalarySchema ──────────────────────────────────────────────────────

describe("processSalarySchema", () => {
  const validInput = {
    staff_id: "staff-abc",
    month: "2025-04",
    amount: 35000,
  };

  it("accepts valid input with required fields only", () => {
    const result = processSalarySchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts valid input with all optional fields", () => {
    const result = processSalarySchema.safeParse({
      ...validInput,
      notes: "April salary",
      payment_date: "2025-04-30",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty staff_id", () => {
    const result = processSalarySchema.safeParse({ ...validInput, staff_id: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.staff_id).toBeDefined();
    }
  });

  it("rejects month in wrong format — missing day separator", () => {
    const result = processSalarySchema.safeParse({
      ...validInput,
      month: "2025-4",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.month).toBeDefined();
    }
  });

  it("rejects month in YYYY-MM-DD format (full date, not allowed)", () => {
    const result = processSalarySchema.safeParse({
      ...validInput,
      month: "2025-04-01",
    });
    expect(result.success).toBe(false);
  });

  it("accepts month '2025-12' (December boundary)", () => {
    const result = processSalarySchema.safeParse({
      ...validInput,
      month: "2025-12",
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero amount", () => {
    const result = processSalarySchema.safeParse({ ...validInput, amount: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.amount).toBeDefined();
    }
  });

  it("rejects negative amount", () => {
    const result = processSalarySchema.safeParse({
      ...validInput,
      amount: -1000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects amount with more than 2 decimal places", () => {
    const result = processSalarySchema.safeParse({
      ...validInput,
      amount: 35000.123,
    });
    expect(result.success).toBe(false);
  });

  it("accepts amount with exactly 2 decimal places", () => {
    const result = processSalarySchema.safeParse({
      ...validInput,
      amount: 35000.50,
    });
    expect(result.success).toBe(true);
  });

  it("rejects notes exceeding 500 characters", () => {
    const result = processSalarySchema.safeParse({
      ...validInput,
      notes: "N".repeat(501),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.notes).toBeDefined();
    }
  });

  it("rejects payment_date in wrong format", () => {
    const result = processSalarySchema.safeParse({
      ...validInput,
      payment_date: "30-04-2025",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.payment_date).toBeDefined();
    }
  });

  it("accepts payment_date in YYYY-MM-DD format", () => {
    const result = processSalarySchema.safeParse({
      ...validInput,
      payment_date: "2025-04-30",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.payment_date).toBe("2025-04-30");
    }
  });

  it("notes defaults to undefined when not provided", () => {
    const result = processSalarySchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBeUndefined();
    }
  });
});

// ─── bulkSalarySchema ─────────────────────────────────────────────────────────

describe("bulkSalarySchema", () => {
  it("accepts valid month", () => {
    const result = bulkSalarySchema.safeParse({ month: "2025-04" });
    expect(result.success).toBe(true);
  });

  it("accepts month with optional payment_date", () => {
    const result = bulkSalarySchema.safeParse({
      month: "2025-04",
      payment_date: "2025-04-28",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.payment_date).toBe("2025-04-28");
    }
  });

  it("rejects missing month", () => {
    const result = bulkSalarySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects month in wrong format", () => {
    const result = bulkSalarySchema.safeParse({ month: "April 2025" });
    expect(result.success).toBe(false);
  });

  it("rejects payment_date in non-ISO format", () => {
    const result = bulkSalarySchema.safeParse({
      month: "2025-04",
      payment_date: "04/28/2025",
    });
    expect(result.success).toBe(false);
  });
});

// ─── salaryListQuerySchema ────────────────────────────────────────────────────

describe("salaryListQuerySchema", () => {
  it("accepts empty query with defaults", () => {
    const result = salaryListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.per_page).toBe(50);
    }
  });

  it("accepts valid month filter", () => {
    const result = salaryListQuerySchema.safeParse({ month: "2025-04" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.month).toBe("2025-04");
    }
  });

  it("rejects invalid month filter", () => {
    const result = salaryListQuerySchema.safeParse({ month: "04-2025" });
    expect(result.success).toBe(false);
  });

  it("accepts optional staff_id filter", () => {
    const result = salaryListQuerySchema.safeParse({ staff_id: "some-id" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.staff_id).toBe("some-id");
    }
  });

  it("coerces page and per_page from strings", () => {
    const result = salaryListQuerySchema.safeParse({ page: "2", per_page: "10" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.per_page).toBe(10);
    }
  });

  it("rejects page less than 1", () => {
    const result = salaryListQuerySchema.safeParse({ page: "0" });
    expect(result.success).toBe(false);
  });

  it("rejects per_page greater than 100", () => {
    const result = salaryListQuerySchema.safeParse({ per_page: "200" });
    expect(result.success).toBe(false);
  });

  it("accepts page 1 and per_page 100 (boundary values)", () => {
    const result = salaryListQuerySchema.safeParse({
      page: "1",
      per_page: "100",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.per_page).toBe(100);
    }
  });
});
