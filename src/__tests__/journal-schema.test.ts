import { describe, it, expect } from "vitest";
import {
  createJournalEntrySchema,
  journalListQuerySchema,
} from "@/lib/schemas/journal";

// ─── createJournalEntrySchema ─────────────────────────────────────────────────

describe("createJournalEntrySchema", () => {
  // Use RFC 4122 compliant v4 UUIDs (version nibble = 4, variant nibble = 8-b)
  const REF_ID = "a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5";
  const ACCT_1 = "b2c3d4e5-f6a7-4b8c-9d0e-f1a2b3c4d5e6";
  const ACCT_2 = "c3d4e5f6-a7b8-4c9d-ae0f-a2b3c4d5e6f7";
  const ACCT_3 = "d4e5f6a7-b8c9-4d0e-bf10-b3c4d5e6f7a8";

  const validBase = {
    date: "2026-04-14",
    reference_type: "FEE",
    reference_id: REF_ID,
    description: "Fee payment for Term 1",
    lines: [
      {
        account_id: ACCT_1,
        debit: 5000,
        credit: 0,
      },
      {
        account_id: ACCT_2,
        debit: 0,
        credit: 5000,
      },
    ],
  };

  it("accepts a valid balanced journal entry", () => {
    const result = createJournalEntrySchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("rejects when debits do not equal credits", () => {
    const unbalanced = {
      ...validBase,
      lines: [
        {
          account_id: ACCT_1,
          debit: 5000,
          credit: 0,
        },
        {
          account_id: ACCT_2,
          debit: 0,
          credit: 4999,
        },
      ],
    };
    const result = createJournalEntrySchema.safeParse(unbalanced);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes("unbalanced"))).toBe(true);
    }
  });

  it("rejects when a line has both debit and credit", () => {
    const badLine = {
      ...validBase,
      lines: [
        {
          account_id: ACCT_1,
          debit: 5000,
          credit: 5000,
        },
        {
          account_id: ACCT_2,
          debit: 0,
          credit: 5000,
        },
      ],
    };
    const result = createJournalEntrySchema.safeParse(badLine);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(
        messages.some((m) => m.includes("both debit and credit"))
      ).toBe(true);
    }
  });

  it("rejects when a line has neither debit nor credit", () => {
    const emptyLine = {
      ...validBase,
      lines: [
        {
          account_id: ACCT_1,
          debit: 0,
          credit: 0,
        },
        {
          account_id: ACCT_2,
          debit: 0,
          credit: 0,
        },
      ],
    };
    const result = createJournalEntrySchema.safeParse(emptyLine);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(
        messages.some((m) => m.includes("either a debit or a credit"))
      ).toBe(true);
    }
  });

  it("rejects fewer than 2 lines", () => {
    const singleLine = {
      ...validBase,
      lines: [
        {
          account_id: ACCT_1,
          debit: 5000,
          credit: 0,
        },
      ],
    };
    const result = createJournalEntrySchema.safeParse(singleLine);
    expect(result.success).toBe(false);
  });

  it("rejects an invalid reference_type", () => {
    const bad = { ...validBase, reference_type: "UNKNOWN" };
    const result = createJournalEntrySchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects a malformed date", () => {
    const bad = { ...validBase, date: "14-04-2026" };
    const result = createJournalEntrySchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects an invalid reference_id UUID", () => {
    const bad = { ...validBase, reference_id: "not-a-uuid" };
    const result = createJournalEntrySchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects empty description", () => {
    const bad = { ...validBase, description: "" };
    const result = createJournalEntrySchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("accepts a multi-line balanced entry (3 lines)", () => {
    const threeLines = {
      ...validBase,
      lines: [
        {
          account_id: ACCT_1,
          debit: 3000,
          credit: 0,
        },
        {
          account_id: ACCT_3,
          debit: 2000,
          credit: 0,
        },
        {
          account_id: ACCT_2,
          debit: 0,
          credit: 5000,
        },
      ],
    };
    const result = createJournalEntrySchema.safeParse(threeLines);
    expect(result.success).toBe(true);
  });

  it("handles floating-point amounts correctly when balanced", () => {
    // 0.1 + 0.2 === 0.30000000000000004 in JS — our rounding must handle this
    const floatEntry = {
      ...validBase,
      lines: [
        {
          account_id: ACCT_1,
          debit: 0.1 + 0.2,
          credit: 0,
        },
        {
          account_id: ACCT_2,
          debit: 0,
          credit: 0.3,
        },
      ],
    };
    const result = createJournalEntrySchema.safeParse(floatEntry);
    expect(result.success).toBe(true);
  });
});

// ─── journalListQuerySchema ───────────────────────────────────────────────────

describe("journalListQuerySchema", () => {
  it("accepts empty query and applies defaults", () => {
    const result = journalListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.per_page).toBe(50);
    }
  });

  it("accepts valid reference_type filter", () => {
    const result = journalListQuerySchema.safeParse({ reference_type: "SALARY" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid reference_type", () => {
    const result = journalListQuerySchema.safeParse({ reference_type: "INVALID" });
    expect(result.success).toBe(false);
  });

  it("accepts valid date range", () => {
    const result = journalListQuerySchema.safeParse({
      date_from: "2026-01-01",
      date_to: "2026-12-31",
    });
    expect(result.success).toBe(true);
  });

  it("rejects malformed date_from", () => {
    const result = journalListQuerySchema.safeParse({ date_from: "01/01/2026" });
    expect(result.success).toBe(false);
  });

  it("coerces page from string to number", () => {
    const result = journalListQuerySchema.safeParse({ page: "3" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
    }
  });

  it("rejects page less than 1", () => {
    const result = journalListQuerySchema.safeParse({ page: "0" });
    expect(result.success).toBe(false);
  });

  it("rejects per_page greater than 100", () => {
    const result = journalListQuerySchema.safeParse({ per_page: "101" });
    expect(result.success).toBe(false);
  });
});
