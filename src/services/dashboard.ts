import { createClient } from "@/lib/supabase/server";
import type { ServiceResult } from "@/services/student";

// ─── Result types ─────────────────────────────────────────────────────────────

export interface RecentTransaction {
  id: string;
  student_name: string;
  paid_amount: number;
  payment_date: string;
  receipt_no: string;
}

export interface DashboardStats {
  todayCollection: number;
  totalActiveStudents: number;
  monthlyIncome: number;
  monthlyExpense: number;
  pendingDues: number;
  recentTransactions: RecentTransaction[];
}

// ─── Service function ─────────────────────────────────────────────────────────

/**
 * Aggregates all dashboard statistics in a single server-side call.
 *
 * - todayCollection: sum of fee_transactions.paid_amount where payment_date = today
 * - totalActiveStudents: count of students where status = 'active'
 * - monthlyIncome: sum of fee_transactions.paid_amount for the current month
 * - monthlyExpense: sum of expenses.amount for the current month
 * - pendingDues: sum of (total_fee - paid_amount - discount_amount) across active students
 * - recentTransactions: last 5 fee_transactions with student name
 */
export async function getDashboardStats(): Promise<
  ServiceResult<DashboardStats>
> {
  try {
    const supabase = await createClient();

    // ── Derive date boundaries ────────────────────────────────────────────────
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const monthStart = `${year}-${month}-01`;
    // Last day of current month
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const monthEnd = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;

    // ── 1. Today's collection ─────────────────────────────────────────────────
    const { data: todayRows, error: todayError } = await supabase
      .from("fee_transactions")
      .select("paid_amount")
      .eq("payment_date", todayStr);

    if (todayError) {
      return { data: null, error: todayError.message };
    }

    const todayCollection = (todayRows ?? []).reduce(
      (sum, row) => sum + Number(row.paid_amount),
      0
    );

    // ── 2. Active student count ───────────────────────────────────────────────
    const { count: studentCount, error: studentError } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");

    if (studentError) {
      return { data: null, error: studentError.message };
    }

    const totalActiveStudents = studentCount ?? 0;

    // ── 3. Monthly income & expense from source tables ────────────────────────
    const { data: monthlyIncomeRows, error: monthlyIncomeError } = await supabase
      .from("fee_transactions")
      .select("paid_amount")
      .gte("payment_date", monthStart)
      .lte("payment_date", monthEnd);

    if (monthlyIncomeError) {
      return { data: null, error: monthlyIncomeError.message };
    }

    const monthlyIncome =
      Math.round(
        (monthlyIncomeRows ?? []).reduce(
          (sum, row) => sum + Number(row.paid_amount),
          0
        ) * 100
      ) / 100;

    const { data: monthlyExpenseRows, error: monthlyExpenseError } = await supabase
      .from("expenses")
      .select("amount")
      .gte("date", monthStart)
      .lte("date", monthEnd);

    if (monthlyExpenseError) {
      return { data: null, error: monthlyExpenseError.message };
    }

    const monthlyExpense =
      Math.round(
        (monthlyExpenseRows ?? []).reduce(
          (sum, row) => sum + Number(row.amount),
          0
        ) * 100
      ) / 100;

    // ── 4. Pending dues across all active students ────────────────────────────
    // Fetch all active student IDs
    const { data: activeStudents, error: activeError } = await supabase
      .from("students")
      .select("id")
      .eq("status", "active");

    if (activeError) {
      return { data: null, error: activeError.message };
    }

    const activeStudentIds = (activeStudents ?? []).map(
      (s: { id: string }) => s.id
    );

    let pendingDues = 0;

    if (activeStudentIds.length > 0) {
      const { data: feeRows, error: feeError } = await supabase
        .from("fee_transactions")
        .select("student_id, total_fee, paid_amount, discount_amount")
        .in("student_id", activeStudentIds);

      if (feeError) {
        return { data: null, error: feeError.message };
      }

      // Aggregate max total_fee per student (in case of multiple transactions)
      // and sum payments/discounts
      const studentMap = new Map<
        string,
        { total_fee: number; paid: number; discount: number }
      >();

      for (const row of feeRows ?? []) {
        const sid = row.student_id as string;
        const existing = studentMap.get(sid) ?? {
          total_fee: 0,
          paid: 0,
          discount: 0,
        };
        existing.total_fee = Math.max(existing.total_fee, Number(row.total_fee));
        existing.paid += Number(row.paid_amount);
        existing.discount += Number(row.discount_amount);
        studentMap.set(sid, existing);
      }

      for (const agg of studentMap.values()) {
        const pending = agg.total_fee - agg.paid - agg.discount;
        if (pending > 0) {
          pendingDues += pending;
        }
      }

      pendingDues = Math.round(pendingDues * 100) / 100;
    }

    // ── 5. Recent transactions (last 5 with student name) ────────────────────
    const { data: recentRows, error: recentError } = await supabase
      .from("fee_transactions")
      .select("id, paid_amount, payment_date, receipt_no, students!inner(name)")
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);

    if (recentError) {
      return { data: null, error: recentError.message };
    }

    type RecentRowShape = {
      id: unknown;
      paid_amount: unknown;
      payment_date: unknown;
      receipt_no: unknown;
      students: unknown;
    };

    const recentTransactions: RecentTransaction[] = (recentRows ?? []).map(
      (rawRow) => {
        const row = rawRow as unknown as RecentRowShape;
        const studentRaw = row.students;
        const student = Array.isArray(studentRaw)
          ? (studentRaw[0] as { name: string } | undefined) ?? null
          : (studentRaw as { name: string } | null);

        return {
          id: row.id as string,
          student_name: student?.name ?? "Unknown",
          paid_amount: Math.round(Number(row.paid_amount) * 100) / 100,
          payment_date: row.payment_date as string,
          receipt_no: row.receipt_no as string,
        };
      }
    );

    return {
      data: {
        todayCollection: Math.round(todayCollection * 100) / 100,
        totalActiveStudents,
        monthlyIncome,
        monthlyExpense,
        pendingDues,
        recentTransactions,
      },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}
