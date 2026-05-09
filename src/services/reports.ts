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

export interface ProfitLossLine {
  account_id: string;
  account_name: string;
  account_type: "INCOME" | "EXPENSE";
  amount: number;
}

export interface ProfitLossResult {
  income_lines: ProfitLossLine[];
  expense_lines: ProfitLossLine[];
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

/**
 * Aggregates income and expense totals from journal lines within a date range.
 * Source of truth: journal_entries + journal_lines joined with accounts.
 * INCOME accounts: natural balance = credits - debits (positive credit = income).
 * EXPENSE accounts: natural balance = debits - credits (positive debit = expense).
 */
export async function getIncomeVsExpense(
  dateFrom: string,
  dateTo: string
): Promise<ServiceResult<IncomeExpenseResult>> {
  try {
    const supabase = await createClient();

    // Fetch journal lines for entries in the date range, joining account type
    const { data: rows, error } = await supabase
      .from("journal_lines")
      .select(
        "debit, credit, account_id, accounts!inner(type), journal_entries!inner(date)"
      )
      .gte("journal_entries.date" as string, dateFrom)
      .lte("journal_entries.date" as string, dateTo);

    if (error) {
      return { data: null, error: error.message };
    }

    let totalIncome = 0;
    let totalExpense = 0;

    type RowShape = {
      debit: unknown;
      credit: unknown;
      accounts: unknown;
    };

    for (const rawRow of rows ?? []) {
      const row = rawRow as unknown as RowShape;
      const accountRaw = row.accounts;
      // Supabase may return the joined row as an array (when using !inner) or object
      const account = Array.isArray(accountRaw)
        ? (accountRaw[0] as { type: string } | undefined) ?? null
        : (accountRaw as { type: string } | null);
      if (!account) continue;
      const debit = Number(row.debit);
      const credit = Number(row.credit);

      if (account.type === "INCOME") {
        // Income = credit-normal: income earned = credits - debits
        totalIncome += credit - debit;
      } else if (account.type === "EXPENSE") {
        // Expense = debit-normal: expense incurred = debits - credits
        totalExpense += debit - credit;
      }
    }

    totalIncome = Math.round(totalIncome * 100) / 100;
    totalExpense = Math.round(totalExpense * 100) / 100;

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

/**
 * Returns income and expense breakdowns per account within a date range.
 * Source of truth: journal_entries + journal_lines.
 */
export async function getProfitAndLoss(
  dateFrom: string,
  dateTo: string
): Promise<ServiceResult<ProfitLossResult>> {
  try {
    const supabase = await createClient();

    const { data: rows, error } = await supabase
      .from("journal_lines")
      .select(
        "debit, credit, account_id, accounts!inner(name, type), journal_entries!inner(date)"
      )
      .gte("journal_entries.date" as string, dateFrom)
      .lte("journal_entries.date" as string, dateTo);

    if (error) {
      return { data: null, error: error.message };
    }

    // Aggregate per account
    const accountMap = new Map<
      string,
      { name: string; type: string; debit: number; credit: number }
    >();

    type PLRowShape = {
      debit: unknown;
      credit: unknown;
      account_id: unknown;
      accounts: unknown;
    };

    for (const rawRow of rows ?? []) {
      const row = rawRow as unknown as PLRowShape;
      const accountRaw = row.accounts;
      const account = Array.isArray(accountRaw)
        ? (accountRaw[0] as { name: string; type: string } | undefined) ?? null
        : (accountRaw as { name: string; type: string } | null);
      if (!account) continue;
      if (account.type !== "INCOME" && account.type !== "EXPENSE") continue;

      const id = row.account_id as string;
      const existing = accountMap.get(id) ?? {
        name: account.name,
        type: account.type,
        debit: 0,
        credit: 0,
      };
      existing.debit += Number(row.debit);
      existing.credit += Number(row.credit);
      accountMap.set(id, existing);
    }

    const incomeLines: ProfitLossLine[] = [];
    const expenseLines: ProfitLossLine[] = [];

    for (const [id, acc] of accountMap) {
      if (acc.type === "INCOME") {
        const amount = Math.round((acc.credit - acc.debit) * 100) / 100;
        incomeLines.push({
          account_id: id,
          account_name: acc.name,
          account_type: "INCOME",
          amount,
        });
      } else if (acc.type === "EXPENSE") {
        const amount = Math.round((acc.debit - acc.credit) * 100) / 100;
        expenseLines.push({
          account_id: id,
          account_name: acc.name,
          account_type: "EXPENSE",
          amount,
        });
      }
    }

    const totalIncome = incomeLines.reduce((s, l) => s + l.amount, 0);
    const totalExpense = expenseLines.reduce((s, l) => s + l.amount, 0);

    return {
      data: {
        income_lines: incomeLines,
        expense_lines: expenseLines,
        total_income: Math.round(totalIncome * 100) / 100,
        total_expense: Math.round(totalExpense * 100) / 100,
        net_profit: Math.round((totalIncome - totalExpense) * 100) / 100,
      },
      error: null,
    };
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

    // Map grade → total_fee from config
    const gradeToFee = new Map<string, number>();
    const gradeToConfigId = new Map<string, string>();
    for (const fc of (feeConfigs ?? []) as Array<{ id: string; grade: string; total_fee: number }>) {
      gradeToFee.set(fc.grade, Number(fc.total_fee));
      gradeToConfigId.set(fc.grade, fc.id);
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
      }>
    )
      .map((s) => {
        // Get the total fee from the fee config for this student's grade
        const totalFee = Math.round((gradeToFee.get(s.grade) ?? 0) * 100) / 100;
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

// ─── RPT-007: Salary Report ───────────────────────────────────────────────────

export interface SalaryReportRow {
  id: string;
  staff_id: string;
  staff_name: string;
  month: string;
  amount: number;
  payment_date: string;
  notes: string | null;
}

export interface SalaryReportResult {
  rows: SalaryReportRow[];
  total: number;
}

/**
 * Returns salary payments, optionally filtered by month (YYYY-MM).
 * Joins staff table for staff name.
 */
export async function getSalaryReport(
  month?: string
): Promise<ServiceResult<SalaryReportResult>> {
  try {
    const supabase = await createClient();

    let builder = supabase
      .from("salary_payments")
      .select("id, staff_id, amount, month, payment_date, notes, staff(name)")
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (month) {
      builder = builder.eq("month", month);
    }

    const { data, error } = await builder;

    if (error) {
      return { data: null, error: error.message };
    }

    type SalaryRowShape = {
      id: unknown;
      staff_id: unknown;
      amount: unknown;
      month: unknown;
      payment_date: unknown;
      notes: unknown;
      staff: unknown;
    };

    const rows: SalaryReportRow[] = (data ?? []).map((rawRow) => {
      const row = rawRow as unknown as SalaryRowShape;
      const staffRaw = row.staff;
      const staff = Array.isArray(staffRaw)
        ? (staffRaw[0] as { name: string } | undefined) ?? null
        : (staffRaw as { name: string } | null);

      return {
        id: row.id as string,
        staff_id: row.staff_id as string,
        staff_name: staff?.name ?? "Unknown",
        month: row.month as string,
        amount: Math.round(Number(row.amount) * 100) / 100,
        payment_date: row.payment_date as string,
        notes: (row.notes as string | null) ?? null,
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
