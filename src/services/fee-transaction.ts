import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import type { FeeTransaction } from "@/types/database";
import type { ServiceResult } from "@/services/student";
import type { CollectFeeInput } from "@/lib/schemas/fee-transaction";

export interface CollectFeeOutput {
  transaction: FeeTransaction;
  receipt_no: string;
}

export interface FeeSummary {
  total_fee: number;
  total_paid: number;
  total_discount: number;
  pending_balance: number;
}

export interface FeeTransactionWithStudent extends FeeTransaction {
  student_name?: string;
  student_admission_no?: string;
}

/**
 * Generates the next sequential receipt number for the current year.
 * Format: REC-YYYY-NNNN (zero-padded to 4 digits, grows beyond 4 if needed)
 */
export async function generateReceiptNo(): Promise<ServiceResult<string>> {
  try {
    const supabase = await createClient();
    const year = new Date().getFullYear();
    const prefix = `REC-${year}-`;

    const { data, error } = await supabase
      .from("fee_transactions")
      .select("receipt_no")
      .like("receipt_no", `${prefix}%`)
      .order("receipt_no", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    let nextSeq = 1;
    if (data?.receipt_no) {
      const suffix = data.receipt_no.slice(prefix.length);
      const parsed = parseInt(suffix, 10);
      if (!isNaN(parsed)) {
        nextSeq = parsed + 1;
      }
    }

    const padded = String(nextSeq).padStart(4, "0");
    return { data: `${prefix}${padded}`, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

/**
 * Collects a fee payment:
 * 1. Validates pending balance is sufficient
 * 2. Generates a receipt number
 * 3. Inserts a fee_transaction record (with the chosen account)
 * 4. Writes an audit log entry
 */
export async function collectFee(
  input: CollectFeeInput,
  receivedBy: string
): Promise<ServiceResult<CollectFeeOutput>> {
  try {
    const supabase = await createClient();

    // 1. Load the fee config to get total_fee
    const { data: feeConfig, error: configError } = await supabase
      .from("fee_configs")
      .select("total_fee")
      .eq("id", input.fee_config_id)
      .single();

    if (configError || !feeConfig) {
      return { data: null, error: "Fee configuration not found" };
    }

    // 2. Compute total paid + discounted so far for this student+config
    const { data: existing, error: existingError } = await supabase
      .from("fee_transactions")
      .select("paid_amount, discount_amount")
      .eq("student_id", input.student_id)
      .eq("fee_config_id", input.fee_config_id);

    if (existingError) {
      return { data: null, error: existingError.message };
    }

    const totalPaidSoFar = (existing ?? []).reduce(
      (sum, t) => sum + Number(t.paid_amount),
      0
    );
    const totalDiscountSoFar = (existing ?? []).reduce(
      (sum, t) => sum + Number(t.discount_amount),
      0
    );

    const totalFee = Number(feeConfig.total_fee);
    const pendingBalance =
      Math.round((totalFee - totalPaidSoFar - totalDiscountSoFar) * 100) / 100;

    const paidAmount = Math.round(input.paid_amount * 100) / 100;
    const discountAmount = Math.round(input.discount_amount * 100) / 100;
    const totalDeduction =
      Math.round((paidAmount + discountAmount) * 100) / 100;

    if (totalDeduction > pendingBalance + 0.001) {
      return {
        data: null,
        error: `Payment amount (${totalDeduction}) exceeds pending balance (${pendingBalance})`,
      };
    }

    // 3. Generate receipt number
    const receiptResult = await generateReceiptNo();
    if (receiptResult.error || !receiptResult.data) {
      return {
        data: null,
        error: receiptResult.error ?? "Failed to generate receipt number",
      };
    }
    const receiptNo = receiptResult.data;

    const paymentDate =
      input.payment_date ?? new Date().toISOString().slice(0, 10);

    // 4. Resolve staff ID from auth user ID
    const { data: staffRecord } = await supabase
      .from("staff")
      .select("id")
      .eq("user_id", receivedBy)
      .eq("is_active", true)
      .maybeSingle();

    const staffId = staffRecord?.id as string | undefined;
    if (!staffId) {
      return {
        data: null,
        error: "No active staff record found for the current user. Please create a staff profile first.",
      };
    }

    // 5. Insert the fee_transaction record
    const { data: txData, error: txError } = await supabase
      .from("fee_transactions")
      .insert({
        student_id: input.student_id,
        fee_config_id: input.fee_config_id,
        account_id: input.account_id,
        total_fee: totalFee,
        paid_amount: paidAmount,
        discount_amount: discountAmount,
        discount_reason: input.discount_reason ?? null,
        received_by: staffId,
        receipt_no: receiptNo,
        payment_date: paymentDate,
      })
      .select()
      .single();

    if (txError) {
      return { data: null, error: txError.message };
    }

    const transaction = txData as FeeTransaction;

    await logAudit(receivedBy, "FEE_COLLECT", "fee_transaction", transaction.id, {
      receipt_no: receiptNo,
      student_id: input.student_id,
      fee_config_id: input.fee_config_id,
      account_id: input.account_id,
      paid_amount: paidAmount,
      discount_amount: discountAmount,
      payment_date: paymentDate,
    });

    return {
      data: { transaction, receipt_no: receiptNo },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

/**
 * Returns all fee transactions for a student, ordered newest-first.
 */
export async function getStudentFeeHistory(
  studentId: string
): Promise<ServiceResult<FeeTransaction[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("fee_transactions")
      .select("*")
      .eq("student_id", studentId)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: (data ?? []) as FeeTransaction[], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

/**
 * Returns the fee summary (total, paid, discount, pending) for a
 * specific student + fee config combination.
 */
export async function getStudentFeeSummary(
  studentId: string,
  feeConfigId: string
): Promise<ServiceResult<FeeSummary>> {
  try {
    const supabase = await createClient();

    // Fetch fee config total
    const { data: feeConfig, error: configError } = await supabase
      .from("fee_configs")
      .select("total_fee")
      .eq("id", feeConfigId)
      .single();

    if (configError || !feeConfig) {
      return { data: null, error: "Fee configuration not found" };
    }

    const totalFee = Number(feeConfig.total_fee);

    // Fetch all transactions for this student + config
    const { data: transactions, error: txError } = await supabase
      .from("fee_transactions")
      .select("paid_amount, discount_amount")
      .eq("student_id", studentId)
      .eq("fee_config_id", feeConfigId);

    if (txError) {
      return { data: null, error: txError.message };
    }

    const totalPaid = (transactions ?? []).reduce(
      (sum, t) => sum + Number(t.paid_amount),
      0
    );
    const totalDiscount = (transactions ?? []).reduce(
      (sum, t) => sum + Number(t.discount_amount),
      0
    );

    const pendingBalance =
      Math.round((totalFee - totalPaid - totalDiscount) * 100) / 100;

    return {
      data: {
        total_fee: Math.round(totalFee * 100) / 100,
        total_paid: Math.round(totalPaid * 100) / 100,
        total_discount: Math.round(totalDiscount * 100) / 100,
        pending_balance: pendingBalance,
      },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}
