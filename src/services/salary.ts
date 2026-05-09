import { createClient } from "@/lib/supabase/server";
import { createSalaryEntry } from "@/services/ledger";
import { logAudit } from "@/lib/audit";
import type { SalaryPayment } from "@/types/database";
import type { ServiceResult } from "@/services/student";
import type { SalaryListQuery } from "@/lib/schemas/salary";

export interface SalaryPaymentWithStaff extends SalaryPayment {
  staff: {
    id: string;
    name: string;
    email: string;
    salary: number;
    role?: { id: string; name: string } | null;
  } | null;
}

export interface SalaryPaymentListResult {
  payments: SalaryPaymentWithStaff[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface StaffPayrollRow {
  id: string;
  name: string;
  email: string;
  salary: number;
  is_active: boolean;
  role?: { id: string; name: string } | null;
  payment: SalaryPayment | null;
}

export interface BulkSalaryResult {
  processed: number;
  skipped: number;
  errors: Array<{ staff_id: string; name: string; error: string }>;
}

/**
 * Process salary for a single staff member for the given month.
 * Inserts into salary_payments, creates a ledger journal entry, and writes audit log.
 * Returns an error if the staff member has already been paid for this month.
 */
export async function processSalary(
  userId: string,
  staffId: string,
  month: string,
  amount: number,
  notes?: string,
  paymentDate?: string
): Promise<ServiceResult<SalaryPayment>> {
  try {
    const supabase = await createClient();
    const date = paymentDate ?? new Date().toISOString().split("T")[0]!;

    // Verify staff exists and is active
    const { data: staffRow, error: staffError } = await supabase
      .from("staff")
      .select("id, name, is_active")
      .eq("id", staffId)
      .single();

    if (staffError || !staffRow) {
      return { data: null, error: "Staff member not found" };
    }
    if (!staffRow.is_active) {
      return { data: null, error: "Cannot process salary for inactive staff" };
    }

    // Insert salary payment record — unique(staff_id, month) constraint guards duplicates
    const { data: payment, error: insertError } = await supabase
      .from("salary_payments")
      .insert({
        staff_id: staffId,
        amount,
        month,
        payment_date: date,
        notes: notes ?? "",
      })
      .select()
      .single();

    if (insertError) {
      // Postgres unique violation code 23505
      if (insertError.code === "23505") {
        return {
          data: null,
          error: `Salary for ${staffRow.name} has already been processed for ${month}`,
        };
      }
      return { data: null, error: insertError.message };
    }

    const typedPayment = payment as SalaryPayment;

    // Create double-entry journal entry: debit Salary Expense, credit Bank
    const ledgerResult = await createSalaryEntry({
      staffId,
      amount,
      date,
      description: `Salary payment — ${staffRow.name} (${month})${notes ? ` — ${notes}` : ""}`,
    });

    if (ledgerResult.error) {
      // Ledger failure: delete the payment record to keep data consistent
      await supabase
        .from("salary_payments")
        .delete()
        .eq("id", typedPayment.id);
      return {
        data: null,
        error: `Ledger entry failed: ${ledgerResult.error}`,
      };
    }

    // Audit log — financial action requires audit
    await logAudit(userId, "PROCESS_SALARY", "salary_payment", typedPayment.id, {
      staff_id: staffId,
      staff_name: staffRow.name,
      month,
      amount,
      payment_date: date,
    });

    return { data: typedPayment, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

/**
 * Process salary for ALL active staff for a given month.
 * Skips staff who have already been paid for this month.
 * Skips staff with salary = 0.
 * Returns a summary of processed, skipped, and errored rows.
 */
export async function processBulkSalary(
  userId: string,
  month: string,
  paymentDate?: string
): Promise<ServiceResult<BulkSalaryResult>> {
  try {
    const supabase = await createClient();

    // Fetch all active staff with salary > 0
    const { data: staffList, error: staffError } = await supabase
      .from("staff")
      .select("id, name, salary")
      .eq("is_active", true)
      .gt("salary", 0);

    if (staffError) {
      return { data: null, error: staffError.message };
    }

    if (!staffList || staffList.length === 0) {
      return {
        data: { processed: 0, skipped: 0, errors: [] },
        error: null,
      };
    }

    // Fetch already-paid staff for this month
    const staffIds = staffList.map((s) => s.id);
    const { data: existingPayments, error: paidError } = await supabase
      .from("salary_payments")
      .select("staff_id")
      .eq("month", month)
      .in("staff_id", staffIds);

    if (paidError) {
      return { data: null, error: paidError.message };
    }

    const alreadyPaid = new Set(
      (existingPayments ?? []).map((p) => (p as { staff_id: string }).staff_id)
    );

    let processed = 0;
    let skipped = 0;
    const errors: BulkSalaryResult["errors"] = [];

    for (const staff of staffList as Array<{
      id: string;
      name: string;
      salary: number;
    }>) {
      if (alreadyPaid.has(staff.id)) {
        skipped++;
        continue;
      }

      const result = await processSalary(
        userId,
        staff.id,
        month,
        staff.salary,
        "Bulk salary processing",
        paymentDate
      );

      if (result.error) {
        errors.push({ staff_id: staff.id, name: staff.name, error: result.error });
      } else {
        processed++;
      }
    }

    return {
      data: { processed, skipped, errors },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

/**
 * List salary payments with optional filters.
 */
export async function listSalaryPayments(
  query: SalaryListQuery
): Promise<ServiceResult<SalaryPaymentListResult>> {
  try {
    const supabase = await createClient();
    const { month, staff_id, page, per_page } = query;
    const from = (page - 1) * per_page;
    const to = from + per_page - 1;

    let builder = supabase
      .from("salary_payments")
      .select("*, staff:staff(id, name, email, salary, role:roles(id, name))", {
        count: "exact",
      })
      .order("payment_date", { ascending: false })
      .range(from, to);

    if (month) {
      builder = builder.eq("month", month);
    }
    if (staff_id) {
      builder = builder.eq("staff_id", staff_id);
    }

    const { data, error, count } = await builder;

    if (error) {
      return { data: null, error: error.message };
    }

    const total = count ?? 0;
    return {
      data: {
        payments: (data ?? []) as SalaryPaymentWithStaff[],
        total,
        page,
        per_page,
        total_pages: Math.ceil(total / per_page),
      },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

/**
 * Get all active staff with their salary payment status for a specific month.
 * Used by the payroll UI to show the payroll grid.
 */
export async function getSalaryPaymentsByMonth(
  month: string
): Promise<ServiceResult<StaffPayrollRow[]>> {
  try {
    const supabase = await createClient();

    // Fetch all active staff
    const { data: staffList, error: staffError } = await supabase
      .from("staff")
      .select("id, name, email, salary, is_active, role:roles(id, name)")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (staffError) {
      return { data: null, error: staffError.message };
    }

    if (!staffList || staffList.length === 0) {
      return { data: [], error: null };
    }

    const staffIds = (staffList as Array<{ id: string }>).map((s) => s.id);

    // Fetch payments for this month
    const { data: payments, error: payError } = await supabase
      .from("salary_payments")
      .select("*")
      .eq("month", month)
      .in("staff_id", staffIds);

    if (payError) {
      return { data: null, error: payError.message };
    }

    const paymentByStaffId = new Map<string, SalaryPayment>(
      (payments ?? []).map((p) => {
        const typed = p as SalaryPayment;
        return [typed.staff_id, typed];
      })
    );

    type RawStaffRow = {
      id: string;
      name: string;
      email: string;
      salary: number;
      is_active: boolean;
      role: Array<{ id: string; name: string }> | { id: string; name: string } | null;
    };

    const rows: StaffPayrollRow[] = (staffList as unknown as RawStaffRow[]).map(
      (s) => {
        const roleVal = Array.isArray(s.role) ? s.role[0] ?? null : s.role;
        return {
          id: s.id,
          name: s.name,
          email: s.email,
          salary: s.salary,
          is_active: s.is_active,
          role: roleVal,
          payment: paymentByStaffId.get(s.id) ?? null,
        };
      }
    );

    return { data: rows, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}
