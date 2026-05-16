/**
 * SYS-002: Receipt Generation System — unit tests
 *
 * Tests cover:
 * 1. Balance remaining computation logic (mirrors both route.ts and page.tsx)
 * 2. formatINR from @/lib/format
 * 3. Edge cases: full payment, over-discount, zero balance, multiple transactions
 */

import { describe, it, expect } from "vitest";
import { formatINR } from "@/lib/format";

// ─── Helper: replicate the balance computation used in the API route + page ───

interface TxSlim {
  paid_amount: number;
  discount_amount: number;
}

function computeBalanceRemaining(
  totalFee: number,
  transactions: TxSlim[]
): number {
  const totalPaid = transactions.reduce(
    (sum, t) => sum + Number(t.paid_amount),
    0
  );
  const totalDiscount = transactions.reduce(
    (sum, t) => sum + Number(t.discount_amount),
    0
  );
  return Math.round((totalFee - totalPaid - totalDiscount) * 100) / 100;
}

// ─── Balance computation ───────────────────────────────────────────────────────

describe("computeBalanceRemaining", () => {
  it("returns full fee when no transactions exist", () => {
    expect(computeBalanceRemaining(10000, [])).toBe(10000);
  });

  it("returns zero when paid in full with a single payment", () => {
    expect(
      computeBalanceRemaining(10000, [{ paid_amount: 10000, discount_amount: 0 }])
    ).toBe(0);
  });

  it("returns zero when cleared via payment + discount", () => {
    expect(
      computeBalanceRemaining(10000, [
        { paid_amount: 8000, discount_amount: 2000 },
      ])
    ).toBe(0);
  });

  it("returns remaining balance after partial payment", () => {
    expect(
      computeBalanceRemaining(10000, [{ paid_amount: 3000, discount_amount: 0 }])
    ).toBe(7000);
  });

  it("accumulates multiple transactions correctly", () => {
    const txns: TxSlim[] = [
      { paid_amount: 4000, discount_amount: 0 },
      { paid_amount: 3000, discount_amount: 0 },
    ];
    expect(computeBalanceRemaining(10000, txns)).toBe(3000);
  });

  it("handles floating-point amounts without drift (e.g. 0.1 + 0.2)", () => {
    // 10000.30 - (3333.10 + 3333.10 + 3333.10) should be ~0.00 not negative
    const txns: TxSlim[] = [
      { paid_amount: 3333.1, discount_amount: 0 },
      { paid_amount: 3333.1, discount_amount: 0 },
      { paid_amount: 3334.1, discount_amount: 0 },
    ];
    const result = computeBalanceRemaining(10000.3, txns);
    // Should be 0.00 — Math.round(*100)/100 guards against fp drift
    expect(result).toBe(0);
  });

  it("applies discount-only transaction correctly", () => {
    expect(
      computeBalanceRemaining(10000, [{ paid_amount: 0, discount_amount: 500 }])
    ).toBe(9500);
  });

  it("returns negative result when over-paid (data integrity issue — not blocked here)", () => {
    // The route blocks over-payment, but if data exists, computation is honest
    expect(
      computeBalanceRemaining(1000, [{ paid_amount: 1200, discount_amount: 0 }])
    ).toBe(-200);
  });
});

// ─── formatINR ────────────────────────────────────────────────────────────────

describe("formatINR", () => {
  it("formats a round number with Indian locale", () => {
    const result = formatINR(10000);
    // Should contain rupee symbol and the digits
    expect(result).toContain("10,000");
  });

  it("formats a lakh-range amount with Indian comma grouping", () => {
    const result = formatINR(100000);
    expect(result).toContain("1,00,000");
  });

  it("formats zero", () => {
    const result = formatINR(0);
    expect(result).toMatch(/0/);
  });

  it("formats a small amount correctly", () => {
    const result = formatINR(500);
    expect(result).toContain("500");
  });
});

// ─── Receipt number format validation ─────────────────────────────────────────

describe("receipt number format", () => {
  const RECEIPT_PATTERN = /^REC-\d{4}-\d{4,}$/;

  it("matches standard 4-digit sequence", () => {
    expect(RECEIPT_PATTERN.test("REC-2026-0001")).toBe(true);
  });

  it("matches sequence beyond 4 digits (e.g. 10000th receipt)", () => {
    expect(RECEIPT_PATTERN.test("REC-2026-10000")).toBe(true);
  });

  it("rejects malformed receipt numbers", () => {
    expect(RECEIPT_PATTERN.test("REC2026-0001")).toBe(false);
    expect(RECEIPT_PATTERN.test("REC-26-0001")).toBe(false);
    expect(RECEIPT_PATTERN.test("")).toBe(false);
  });

  it("rejects receipt numbers with wrong separator", () => {
    expect(RECEIPT_PATTERN.test("REC/2026/0001")).toBe(false);
  });
});

