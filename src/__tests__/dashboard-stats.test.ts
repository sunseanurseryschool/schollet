import { describe, it, expect } from "vitest";
import type { DashboardStats, RecentTransaction } from "@/services/dashboard";

// ─── Type contract tests (compile-time + runtime shape verification) ──────────

describe("DashboardStats shape", () => {
  it("accepts a fully populated stats object", () => {
    const stats: DashboardStats = {
      todayCollection: 2500,
      totalActiveStudents: 120,
      monthlyIncome: 85000,
      monthlyExpense: 32000,
      pendingDues: 14500,
      recentTransactions: [],
    };

    expect(stats.todayCollection).toBe(2500);
    expect(stats.totalActiveStudents).toBe(120);
    expect(stats.monthlyIncome).toBe(85000);
    expect(stats.monthlyExpense).toBe(32000);
    expect(stats.pendingDues).toBe(14500);
    expect(Array.isArray(stats.recentTransactions)).toBe(true);
  });

  it("accepts zero values (fresh school with no data)", () => {
    const stats: DashboardStats = {
      todayCollection: 0,
      totalActiveStudents: 0,
      monthlyIncome: 0,
      monthlyExpense: 0,
      pendingDues: 0,
      recentTransactions: [],
    };

    expect(stats.todayCollection).toBe(0);
    expect(stats.pendingDues).toBe(0);
  });
});

describe("RecentTransaction shape", () => {
  it("accepts a valid transaction", () => {
    const tx: RecentTransaction = {
      id: "abc-123",
      student_name: "Arjun Kumar",
      paid_amount: 3000,
      payment_date: "2026-04-14",
      receipt_no: "RCP-0042",
    };

    expect(tx.student_name).toBe("Arjun Kumar");
    expect(tx.paid_amount).toBe(3000);
    expect(tx.receipt_no).toBe("RCP-0042");
  });
});

describe("net profit/loss calculation logic", () => {
  it("computes positive net (profit)", () => {
    const income = 50000;
    const expense = 30000;
    const net = income - expense;
    expect(net).toBe(20000);
    expect(net >= 0).toBe(true);
  });

  it("computes negative net (loss)", () => {
    const income = 20000;
    const expense = 35000;
    const net = income - expense;
    expect(net).toBe(-15000);
    expect(net >= 0).toBe(false);
  });

  it("computes breakeven correctly", () => {
    const income = 40000;
    const expense = 40000;
    const net = income - expense;
    expect(net).toBe(0);
    expect(net >= 0).toBe(true); // breakeven treated as profit/neutral
  });
});

describe("pendingDues aggregation guard", () => {
  it("only counts positive pending balances", () => {
    // Simulates the JS aggregation logic used in getDashboardStats
    const students = [
      { total_fee: 10000, paid: 7000, discount: 0 },   // pending: 3000
      { total_fee: 10000, paid: 10000, discount: 0 },  // pending: 0 — excluded
      { total_fee: 10000, paid: 8000, discount: 500 },  // pending: 1500
      { total_fee: 10000, paid: 10500, discount: 0 },  // pending: -500 — excluded (overpay)
    ];

    let total = 0;
    for (const s of students) {
      const pending = s.total_fee - s.paid - s.discount;
      if (pending > 0) total += pending;
    }

    expect(total).toBe(4500);
  });
});
