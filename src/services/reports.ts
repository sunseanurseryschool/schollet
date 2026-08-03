import { createClient } from "@/lib/supabase/server";
import type { ServiceResult } from "@/services/student";
import type { Grade, Section } from "@/types/database";
import type { ExpenseCategory } from "@/lib/schemas/expense";

// ─── Report result types ──────────────────────────────────────────────────────

export interface IncomeExpenseResult {
  total_income: number;
  total_expense: number;
  net: number;
}

export interface ProfitLossResult {
  total_income: number;
  total_expense: number;
  net_profit: number;
}

export interface StudentDuesRow {
  student_id: string;
  admission_no: string;
  name: string;
  grade: Grade;
  section: Section;
  total_fee: number;
  total_paid: number;
  total_discount: number;
  pending: number;
}

export interface DetailedDuesRow extends StudentDuesRow {
  last_payment_date: string | null;
}

export interface GradeBreakdown {
  grade: Grade;
  student_count: number;
  pending_amount: number;
}

export interface DuesSummary {
  total_students_with_dues: number;
  total_pending_amount: number;
  grade_breakdown: GradeBreakdown[];
}

export interface CollectionRow {
  grade: Grade;
  section: Section;
  total_collected: number;
  student_count: number;
}

export interface DiscountRow {
  transaction_id: string;
  student_name: string;
  admission_no: string;
  grade: Grade;
  section: Section;
  discount_amount: number;
  discount_reason: string | null;
  payment_date: string;
  receipt_no: string;
}

// ─── Service functions ────────────────────────────────────────────────────────

async function sumColumn(
  table: "fee_transactions" | "expenses",
  column: "paid_amount" | "amount",
  dateColumn: "payment_date" | "date",
  dateFrom: string,
  dateTo: string
): Promise<number | { error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(table)
    .select(column)
    .gte(dateColumn, dateFrom)
    .lte(dateColumn, dateTo);

  if (error) return { error: error.message };
  return (data ?? []).reduce(
    (sum, row) => sum + Number((row as Record<string, unknown>)[column] ?? 0),
    0
  );
}

/**
 * Income = sum of fee_transactions.paid_amount in range.
 * Expense = sum of expenses.amount in range.
 */
export async function getIncomeVsExpense(
  dateFrom: string,
  dateTo: string
): Promise<ServiceResult<IncomeExpenseResult>> {
  try {
    const incomeRes = await sumColumn(
      "fee_transactions",
      "paid_amount",
      "payment_date",
      dateFrom,
      dateTo
    );
    if (typeof incomeRes === "object") return { data: null, error: incomeRes.error };

    const expenseRes = await sumColumn(
      "expenses",
      "amount",
      "date",
      dateFrom,
      dateTo
    );
    if (typeof expenseRes === "object") return { data: null, error: expenseRes.error };

    const totalIncome = Math.round(incomeRes * 100) / 100;
    const totalExpense = Math.round(expenseRes * 100) / 100;

    return {
      data: {
        total_income: totalIncome,
        total_expense: totalExpense,
        net: Math.round((totalIncome - totalExpense) * 100) / 100,
      },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function getProfitAndLoss(
  dateFrom: string,
  dateTo: string
): Promise<ServiceResult<ProfitLossResult>> {
  const totals = await getIncomeVsExpense(dateFrom, dateTo);
  if (totals.error || !totals.data) {
    return { data: null, error: totals.error };
  }
  return {
    data: {
      total_income: totals.data.total_income,
      total_expense: totals.data.total_expense,
      net_profit: totals.data.net,
    },
    error: null,
  };
}

// ─── Monthly trend (last N months) ────────────────────────────────────────────

export interface MonthlyTrendPoint {
  month: string; // YYYY-MM
  label: string; // "May 2026"
  income: number;
  expense: number;
  net: number;
}

/**
 * Returns one bucket per calendar month between `dateFrom` and `dateTo`
 * (inclusive). Each bucket holds the sum of fees collected, expenses incurred,
 * and the net (income − expense) for that month.
 *
 * Both dates are ISO YYYY-MM-DD. The full month each date lands in is included
 * in the result (the first bucket starts on the 1st of dateFrom's month;
 * the last bucket ends on the last day of dateTo's month).
 */
export async function getMonthlyTrend(
  dateFrom: string,
  dateTo: string
): Promise<ServiceResult<MonthlyTrendPoint[]>> {
  try {
    const supabase = await createClient();

    const fromDate = new Date(`${dateFrom}T00:00:00`);
    const toDate = new Date(`${dateTo}T00:00:00`);
    // Snap to the first day of dateFrom's month and last day of dateTo's month.
    const startOfRange = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
    const endOfRange = new Date(toDate.getFullYear(), toDate.getMonth() + 1, 0);
    const startISO = `${startOfRange.getFullYear()}-${String(startOfRange.getMonth() + 1).padStart(2, "0")}-01`;
    const endISO = `${endOfRange.getFullYear()}-${String(endOfRange.getMonth() + 1).padStart(2, "0")}-${String(endOfRange.getDate()).padStart(2, "0")}`;

    const [feesRes, expensesRes] = await Promise.all([
      supabase
        .from("fee_transactions")
        .select("payment_date, paid_amount")
        .gte("payment_date", startISO)
        .lte("payment_date", endISO),
      supabase
        .from("expenses")
        .select("date, amount")
        .gte("date", startISO)
        .lte("date", endISO),
    ]);

    if (feesRes.error) return { data: null, error: feesRes.error.message };
    if (expensesRes.error) return { data: null, error: expensesRes.error.message };

    const monthKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = (d: Date) =>
      d.toLocaleString("en-US", { month: "short", year: "numeric" });

    // Build every month bucket from startOfRange → endOfRange inclusive.
    const buckets = new Map<
      string,
      { label: string; income: number; expense: number }
    >();
    const cursor = new Date(startOfRange);
    while (
      cursor.getFullYear() < endOfRange.getFullYear() ||
      (cursor.getFullYear() === endOfRange.getFullYear() &&
        cursor.getMonth() <= endOfRange.getMonth())
    ) {
      buckets.set(monthKey(cursor), {
        label: monthLabel(cursor),
        income: 0,
        expense: 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const keyFromISODate = (iso: string) => iso.slice(0, 7); // YYYY-MM

    for (const row of feesRes.data ?? []) {
      const k = keyFromISODate(row.payment_date as string);
      const b = buckets.get(k);
      if (b) b.income += Number(row.paid_amount);
    }
    for (const row of expensesRes.data ?? []) {
      const k = keyFromISODate(row.date as string);
      const b = buckets.get(k);
      if (b) b.expense += Number(row.amount);
    }

    const trend: MonthlyTrendPoint[] = Array.from(buckets.entries()).map(
      ([month, b]) => {
        const income = Math.round(b.income * 100) / 100;
        const expense = Math.round(b.expense * 100) / 100;
        return {
          month,
          label: b.label,
          income,
          expense,
          net: Math.round((income - expense) * 100) / 100,
        };
      }
    );

    return { data: trend, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

// ─── Expense breakdown by category ────────────────────────────────────────────

export interface ExpenseBreakdownLine {
  category: string;
  amount: number;
  percent: number; // 0..100, of total expense
}

/**
 * Expense breakdown for the selected range: sum of expenses.amount grouped
 * by expenses.category.
 *
 * Returns categories sorted by amount descending.
 */
export async function getExpenseBreakdown(
  dateFrom: string,
  dateTo: string
): Promise<ServiceResult<ExpenseBreakdownLine[]>> {
  try {
    const supabase = await createClient();

    const expensesRes = await supabase
      .from("expenses")
      .select("category, amount")
      .gte("date", dateFrom)
      .lte("date", dateTo);

    if (expensesRes.error)
      return { data: null, error: expensesRes.error.message };

    const totals = new Map<string, number>();
    for (const row of expensesRes.data ?? []) {
      const cat = String(row.category);
      totals.set(cat, (totals.get(cat) ?? 0) + Number(row.amount));
    }

    const grandTotal = Array.from(totals.values()).reduce((s, v) => s + v, 0);

    const lines: ExpenseBreakdownLine[] = Array.from(totals.entries())
      .map(([category, amount]) => ({
        category,
        amount: Math.round(amount * 100) / 100,
        percent:
          grandTotal === 0 ? 0 : Math.round((amount / grandTotal) * 1000) / 10,
      }))
      .sort((a, b) => b.amount - a.amount);

    return { data: lines, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

/**
 * Returns all active students with their fee balance summary.
 * Source: fee_transactions (reporting on actual payments vs configured fee).
 */
export async function getStudentDuesReport(
  grade?: string,
  section?: string
): Promise<ServiceResult<StudentDuesRow[]>> {
  try {
    const supabase = await createClient();

    // Fetch students (optionally filtered)
    let studentBuilder = supabase
      .from("students")
      .select("id, admission_no, name, grade, section")
      .eq("status", "active")
      .order("grade")
      .order("name");

    if (grade) {
      studentBuilder = studentBuilder.eq("grade", grade as Grade);
    }
    if (section) {
      studentBuilder = studentBuilder.eq("section", section as Section);
    }

    const { data: students, error: studentsError } = await studentBuilder;

    if (studentsError) {
      return { data: null, error: studentsError.message };
    }

    if (!students || students.length === 0) {
      return { data: [], error: null };
    }

    const studentIds = students.map((s) => s.id as string);

    // Fetch all fee transactions for these students
    const { data: transactions, error: txError } = await supabase
      .from("fee_transactions")
      .select("student_id, total_fee, paid_amount, discount_amount")
      .in("student_id", studentIds);

    if (txError) {
      return { data: null, error: txError.message };
    }

    // Aggregate per student
    const txMap = new Map<
      string,
      { total_fee: number; paid: number; discount: number }
    >();

    for (const tx of transactions ?? []) {
      const sid = tx.student_id as string;
      const existing = txMap.get(sid) ?? { total_fee: 0, paid: 0, discount: 0 };
      // total_fee is the configured fee; we take max since it's the same per config
      // Use the transaction's total_fee field — it is set at collection time
      existing.total_fee = Math.max(existing.total_fee, Number(tx.total_fee));
      existing.paid += Number(tx.paid_amount);
      existing.discount += Number(tx.discount_amount);
      txMap.set(sid, existing);
    }

    const rows: StudentDuesRow[] = (
      students as Array<{
        id: string;
        admission_no: string;
        name: string;
        grade: Grade;
        section: Section;
      }>
    ).map((s) => {
      const agg = txMap.get(s.id) ?? { total_fee: 0, paid: 0, discount: 0 };
      const totalFee = Math.round(agg.total_fee * 100) / 100;
      const totalPaid = Math.round(agg.paid * 100) / 100;
      const totalDiscount = Math.round(agg.discount * 100) / 100;
      const pending = Math.round((totalFee - totalPaid - totalDiscount) * 100) / 100;

      return {
        student_id: s.id,
        admission_no: s.admission_no,
        name: s.name,
        grade: s.grade,
        section: s.section,
        total_fee: totalFee,
        total_paid: totalPaid,
        total_discount: totalDiscount,
        pending,
      };
    });

    return { data: rows, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

/**
 * Returns fee collections aggregated by grade/section within a date range.
 * Source: fee_transactions.
 */
export async function getCollectionReport(
  dateFrom: string,
  dateTo: string,
  grade?: string,
  section?: string
): Promise<ServiceResult<CollectionRow[]>> {
  try {
    const supabase = await createClient();

    // Fetch fee transactions in date range, joining student for grade/section
    let builder = supabase
      .from("fee_transactions")
      .select("paid_amount, student_id, students!inner(grade, section)")
      .gte("payment_date", dateFrom)
      .lte("payment_date", dateTo);

    if (grade) {
      builder = builder.eq("students.grade" as string, grade);
    }
    if (section) {
      builder = builder.eq("students.section" as string, section);
    }

    const { data: transactions, error } = await builder;

    if (error) {
      return { data: null, error: error.message };
    }

    // Aggregate by grade + section
    const aggMap = new Map<
      string,
      { grade: Grade; section: Section; total_collected: number; student_ids: Set<string> }
    >();

    type CollTxShape = {
      paid_amount: unknown;
      student_id: unknown;
      students: unknown;
    };

    for (const rawTx of transactions ?? []) {
      const tx = rawTx as unknown as CollTxShape;
      const studentRaw = tx.students;
      const student = Array.isArray(studentRaw)
        ? (studentRaw[0] as { grade: Grade; section: Section } | undefined) ?? null
        : (studentRaw as { grade: Grade; section: Section } | null);
      if (!student) continue;

      const key = `${student.grade}__${student.section}`;
      const existing = aggMap.get(key) ?? {
        grade: student.grade,
        section: student.section,
        total_collected: 0,
        student_ids: new Set<string>(),
      };
      existing.total_collected += Number(tx.paid_amount);
      existing.student_ids.add(tx.student_id as string);
      aggMap.set(key, existing);
    }

    const rows: CollectionRow[] = Array.from(aggMap.values()).map((agg) => ({
      grade: agg.grade,
      section: agg.section,
      total_collected: Math.round(agg.total_collected * 100) / 100,
      student_count: agg.student_ids.size,
    }));

    // Sort by grade then section
    rows.sort((a, b) => {
      if (a.grade < b.grade) return -1;
      if (a.grade > b.grade) return 1;
      return a.section.localeCompare(b.section);
    });

    return { data: rows, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

/**
 * Returns all active students with a pending balance > 0.
 * Optionally filtered by grade, section, and academic_year.
 * Includes the most recent payment date per student.
 */
export async function getDetailedDuesReport(
  grade?: string,
  section?: string,
  academic_year?: string
): Promise<ServiceResult<DetailedDuesRow[]>> {
  try {
    const supabase = await createClient();

    let studentBuilder = supabase
      .from("students")
      .select("id, admission_no, name, grade, section, fee_config_id")
      .eq("status", "active")
      .order("grade")
      .order("name");

    if (grade) {
      studentBuilder = studentBuilder.eq("grade", grade as Grade);
    }
    if (section) {
      studentBuilder = studentBuilder.eq("section", section as Section);
    }

    const { data: students, error: studentsError } = await studentBuilder;

    if (studentsError) {
      return { data: null, error: studentsError.message };
    }

    if (!students || students.length === 0) {
      return { data: [], error: null };
    }

    const studentIds = students.map((s) => s.id as string);

    // Optionally filter transactions by academic_year via fee_configs
    let configIds: string[] | null = null;
    if (academic_year) {
      const { data: configs, error: configError } = await supabase
        .from("fee_configs")
        .select("id")
        .eq("academic_year", academic_year);

      if (configError) {
        return { data: null, error: configError.message };
      }

      configIds = (configs ?? []).map((c: { id: string }) => c.id);

      if (configIds.length === 0) {
        return { data: [], error: null };
      }
    }

    // Build a map of total fee per grade from fee_configs
    let feeConfigBuilder = supabase
      .from("fee_configs")
      .select("id, grade, total_fee");

    if (academic_year) {
      feeConfigBuilder = feeConfigBuilder.eq("academic_year", academic_year);
    } else {
      // Default: current academic year
      const now = new Date();
      const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      feeConfigBuilder = feeConfigBuilder.eq("academic_year", `${yr}-${yr + 1}`);
    }

    const { data: feeConfigs, error: feeConfigError } = await feeConfigBuilder;
    if (feeConfigError) {
      return { data: null, error: feeConfigError.message };
    }

    // Map config id → total_fee (per-student assignment) and
    // grade → total_fee (fallback for students without an assignment)
    const configToFee = new Map<string, number>();
    const gradeToFee = new Map<string, number>();
    for (const fc of (feeConfigs ?? []) as Array<{ id: string; grade: string; total_fee: number }>) {
      configToFee.set(fc.id, Number(fc.total_fee));
      if (!gradeToFee.has(fc.grade)) {
        gradeToFee.set(fc.grade, Number(fc.total_fee));
      }
    }

    // Get actual config IDs for filtering transactions
    const activeConfigIds = configIds ?? (feeConfigs ?? []).map((c: { id: string }) => c.id);

    let txBuilder = supabase
      .from("fee_transactions")
      .select(
        "student_id, paid_amount, discount_amount, payment_date"
      )
      .in("student_id", studentIds);

    if (activeConfigIds.length > 0) {
      txBuilder = txBuilder.in("fee_config_id", activeConfigIds);
    }

    const { data: transactions, error: txError } = await txBuilder;

    if (txError) {
      return { data: null, error: txError.message };
    }

    type TxShape = {
      student_id: unknown;
      paid_amount: unknown;
      discount_amount: unknown;
      payment_date: unknown;
    };

    const txMap = new Map<
      string,
      {
        paid: number;
        discount: number;
        last_payment_date: string | null;
      }
    >();

    for (const rawTx of transactions ?? []) {
      const tx = rawTx as unknown as TxShape;
      const sid = tx.student_id as string;
      const existing = txMap.get(sid) ?? {
        paid: 0,
        discount: 0,
        last_payment_date: null,
      };
      existing.paid += Number(tx.paid_amount);
      existing.discount += Number(tx.discount_amount);

      const payDate = tx.payment_date as string | null;
      if (
        payDate &&
        (existing.last_payment_date === null ||
          payDate > existing.last_payment_date)
      ) {
        existing.last_payment_date = payDate;
      }

      txMap.set(sid, existing);
    }

    const rows: DetailedDuesRow[] = (
      students as Array<{
        id: string;
        admission_no: string;
        name: string;
        grade: Grade;
        section: Section;
        fee_config_id: string | null;
      }>
    )
      .map((s) => {
        // Use the student's assigned fee structure; fall back to the
        // grade-level config for students without an assignment
        const totalFee =
          Math.round(
            ((s.fee_config_id ? configToFee.get(s.fee_config_id) : undefined) ??
              gradeToFee.get(s.grade) ??
              0) * 100
          ) / 100;
        const agg = txMap.get(s.id) ?? {
          paid: 0,
          discount: 0,
          last_payment_date: null,
        };
        const totalPaid = Math.round(agg.paid * 100) / 100;
        const totalDiscount = Math.round(agg.discount * 100) / 100;
        const pending =
          Math.round((totalFee - totalPaid - totalDiscount) * 100) / 100;

        return {
          student_id: s.id,
          admission_no: s.admission_no,
          name: s.name,
          grade: s.grade,
          section: s.section,
          total_fee: totalFee,
          total_paid: totalPaid,
          total_discount: totalDiscount,
          pending,
          last_payment_date: agg.last_payment_date,
        };
      })
      .filter((r) => r.pending > 0);

    return { data: rows, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

/**
 * Returns aggregate dues summary: total students with dues, total pending amount,
 * and a grade-wise breakdown. Optionally scoped to an academic year.
 */
export async function getDuesSummary(
  academic_year?: string
): Promise<ServiceResult<DuesSummary>> {
  try {
    const detailedResult = await getDetailedDuesReport(
      undefined,
      undefined,
      academic_year
    );

    if (detailedResult.error) {
      return { data: null, error: detailedResult.error };
    }

    const rows = detailedResult.data ?? [];

    const gradeOrder: Grade[] = [
      "PreKG",
      "LKG",
      "UKG",
      "1",
      "2",
      "3",
      "4",
      "5",
    ];

    const gradeMap = new Map<
      Grade,
      { student_count: number; pending_amount: number }
    >();

    for (const row of rows) {
      const existing = gradeMap.get(row.grade) ?? {
        student_count: 0,
        pending_amount: 0,
      };
      existing.student_count += 1;
      existing.pending_amount += row.pending;
      gradeMap.set(row.grade, existing);
    }

    const grade_breakdown: GradeBreakdown[] = gradeOrder
      .filter((g) => gradeMap.has(g))
      .map((g) => {
        const agg = gradeMap.get(g)!;
        return {
          grade: g,
          student_count: agg.student_count,
          pending_amount: Math.round(agg.pending_amount * 100) / 100,
        };
      });

    const total_students_with_dues = rows.length;
    const total_pending_amount =
      Math.round(rows.reduce((sum, r) => sum + r.pending, 0) * 100) / 100;

    return {
      data: { total_students_with_dues, total_pending_amount, grade_breakdown },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

/**
 * Returns all fee transactions with discounts within a date range.
 * Source: fee_transactions.
 */
export async function getDiscountReport(
  dateFrom: string,
  dateTo: string
): Promise<ServiceResult<DiscountRow[]>> {
  try {
    const supabase = await createClient();

    const { data: transactions, error } = await supabase
      .from("fee_transactions")
      .select(
        "id, student_id, discount_amount, discount_reason, payment_date, receipt_no, students!inner(name, admission_no, grade, section)"
      )
      .gt("discount_amount", 0)
      .gte("payment_date", dateFrom)
      .lte("payment_date", dateTo)
      .order("payment_date", { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    type DiscTxShape = {
      id: unknown;
      student_id: unknown;
      discount_amount: unknown;
      discount_reason: unknown;
      payment_date: unknown;
      receipt_no: unknown;
      students: unknown;
    };

    const rows: DiscountRow[] = (transactions ?? []).map((rawTx) => {
      const tx = rawTx as unknown as DiscTxShape;
      const studentRaw = tx.students;
      const student = Array.isArray(studentRaw)
        ? (studentRaw[0] as {
            name: string;
            admission_no: string;
            grade: Grade;
            section: Section;
          } | undefined) ?? null
        : (studentRaw as {
            name: string;
            admission_no: string;
            grade: Grade;
            section: Section;
          } | null);

      return {
        transaction_id: tx.id as string,
        student_name: student?.name ?? "Unknown",
        admission_no: student?.admission_no ?? "—",
        grade: student?.grade ?? ("" as Grade),
        section: student?.section ?? ("" as Section),
        discount_amount: Math.round(Number(tx.discount_amount) * 100) / 100,
        discount_reason: (tx.discount_reason as string | null) ?? null,
        payment_date: tx.payment_date as string,
        receipt_no: tx.receipt_no as string,
      };
    });

    return { data: rows, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

// ─── RPT-005: Expense Report ──────────────────────────────────────────────────

export interface ExpenseReportRow {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  paid_by_name: string;
}

export interface ExpenseReportResult {
  rows: ExpenseReportRow[];
  total: number;
}

/**
 * Returns expenses within a date range, optionally filtered by category.
 * Joins staff table for paid_by name.
 */
export async function getExpenseReport(
  dateFrom: string,
  dateTo: string,
  category?: ExpenseCategory
): Promise<ServiceResult<ExpenseReportResult>> {
  try {
    const supabase = await createClient();

    let builder = supabase
      .from("expenses")
      .select("id, date, category, description, amount, paid_by, staff(name)")
      .gte("date", dateFrom)
      .lte("date", dateTo)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (category) {
      builder = builder.eq("category", category);
    }

    const { data, error } = await builder;

    if (error) {
      return { data: null, error: error.message };
    }

    type ExpenseRowShape = {
      id: unknown;
      date: unknown;
      category: unknown;
      description: unknown;
      amount: unknown;
      paid_by: unknown;
      staff: unknown;
    };

    const rows: ExpenseReportRow[] = (data ?? []).map((rawRow) => {
      const row = rawRow as unknown as ExpenseRowShape;
      const staffRaw = row.staff;
      const staff = Array.isArray(staffRaw)
        ? (staffRaw[0] as { name: string } | undefined) ?? null
        : (staffRaw as { name: string } | null);

      return {
        id: row.id as string,
        date: row.date as string,
        category: row.category as string,
        description: row.description as string,
        amount: Math.round(Number(row.amount) * 100) / 100,
        paid_by_name: staff?.name ?? "Unknown",
      };
    });

    const total = rows.reduce((sum, r) => sum + r.amount, 0);

    return {
      data: {
        rows,
        total: Math.round(total * 100) / 100,
      },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

// ─── RPT-008: Inventory Report ────────────────────────────────────────────────

export interface InventoryReportRow {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  min_quantity: number;
  is_low_stock: boolean;
  total_in: number;
  total_out: number;
}

/**
 * Returns all inventory items with current stock levels and aggregated
 * IN/OUT transaction counts. Low-stock flag is set when quantity <= min_quantity.
 */
export async function getInventoryReport(): Promise<
  ServiceResult<InventoryReportRow[]>
> {
  try {
    const supabase = await createClient();

    const { data: items, error: itemsError } = await supabase
      .from("inventory_items")
      .select("id, name, unit, quantity, min_quantity")
      .order("name", { ascending: true });

    if (itemsError) {
      return { data: null, error: itemsError.message };
    }

    if (!items || items.length === 0) {
      return { data: [], error: null };
    }

    const { data: transactions, error: txError } = await supabase
      .from("inventory_transactions")
      .select("item_id, type, quantity");

    if (txError) {
      return { data: null, error: txError.message };
    }

    const aggMap = new Map<string, { total_in: number; total_out: number }>();

    for (const tx of transactions ?? []) {
      const itemId = tx.item_id as string;
      const existing = aggMap.get(itemId) ?? { total_in: 0, total_out: 0 };
      if ((tx.type as string) === "IN") {
        existing.total_in += Number(tx.quantity);
      } else {
        existing.total_out += Number(tx.quantity);
      }
      aggMap.set(itemId, existing);
    }

    type ItemShape = {
      id: string;
      name: string;
      unit: string;
      quantity: number;
      min_quantity: number;
    };

    const rows: InventoryReportRow[] = (items as ItemShape[]).map((item) => {
      const agg = aggMap.get(item.id) ?? { total_in: 0, total_out: 0 };
      return {
        id: item.id,
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        min_quantity: item.min_quantity,
        is_low_stock: item.quantity <= item.min_quantity,
        total_in: agg.total_in,
        total_out: agg.total_out,
      };
    });

    return { data: rows, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}
