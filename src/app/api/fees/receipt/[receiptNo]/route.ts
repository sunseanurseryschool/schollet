import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStudentById } from "@/services/student";
import { getFeeConfigById } from "@/services/fee-config";
import type { FeeTransaction, Grade, Section } from "@/types/database";

export const dynamic = "force-dynamic";

export interface ReceiptData {
  receipt_no: string;
  payment_date: string;
  account_name: string;
  paid_amount: number;
  discount_amount: number;
  discount_reason: string | null;
  total_fee: number;
  balance_remaining: number;
  student: {
    name: string;
    admission_no: string;
    grade: Grade;
    section: Section;
  };
  fee_heads: { name: string; amount: number }[];
  received_by_name: string | null;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ receiptNo: string }> }
): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { receiptNo } = await context.params;
    if (!receiptNo) {
      return NextResponse.json(
        { error: "Receipt number is required" },
        { status: 400 }
      );
    }

    // 1. Fetch the fee transaction by receipt_no
    const { data: txData, error: txError } = await supabase
      .from("fee_transactions")
      .select("*")
      .eq("receipt_no", receiptNo)
      .maybeSingle();

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }
    if (!txData) {
      return NextResponse.json(
        { error: "Receipt not found" },
        { status: 404 }
      );
    }

    const transaction = txData as FeeTransaction;

    // 2. Fetch student details
    const studentResult = await getStudentById(transaction.student_id);
    if (studentResult.error || !studentResult.data) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }
    const student = studentResult.data;

    // 3. Fetch fee config with heads
    const configResult = await getFeeConfigById(transaction.fee_config_id);
    if (configResult.error || !configResult.data) {
      return NextResponse.json(
        { error: "Fee configuration not found" },
        { status: 404 }
      );
    }
    const feeConfig = configResult.data;

    // 4. Compute balance remaining across all transactions for this student+config
    const { data: allTx, error: allTxError } = await supabase
      .from("fee_transactions")
      .select("paid_amount, discount_amount")
      .eq("student_id", transaction.student_id)
      .eq("fee_config_id", transaction.fee_config_id);

    if (allTxError) {
      return NextResponse.json({ error: allTxError.message }, { status: 500 });
    }

    const totalPaid = (allTx ?? []).reduce(
      (sum, t) => sum + Number(t.paid_amount),
      0
    );
    const totalDiscount = (allTx ?? []).reduce(
      (sum, t) => sum + Number(t.discount_amount),
      0
    );
    const totalFee = Number(feeConfig.total_fee);
    const balanceRemaining =
      Math.round((totalFee - totalPaid - totalDiscount) * 100) / 100;

    // 5. Resolve staff name (best-effort — fall back to null)
    let receivedByName: string | null = null;
    const { data: staffRow } = await supabase
      .from("staff")
      .select("name")
      .eq("id", transaction.received_by)
      .maybeSingle();

    if (staffRow) {
      receivedByName = (staffRow as { name: string }).name;
    }

    // 6. Resolve account name
    let accountName = "—";
    const { data: accountRow } = await supabase
      .from("accounts")
      .select("name")
      .eq("id", transaction.account_id)
      .maybeSingle();
    if (accountRow) {
      accountName = (accountRow as { name: string }).name;
    }

    const receipt: ReceiptData = {
      receipt_no: transaction.receipt_no,
      payment_date: transaction.payment_date,
      account_name: accountName,
      paid_amount: Math.round(Number(transaction.paid_amount) * 100) / 100,
      discount_amount: Math.round(Number(transaction.discount_amount) * 100) / 100,
      discount_reason: transaction.discount_reason,
      total_fee: Math.round(totalFee * 100) / 100,
      balance_remaining: balanceRemaining,
      student: {
        name: student.name,
        admission_no: student.admission_no,
        grade: student.grade,
        section: student.section,
      },
      fee_heads: feeConfig.fee_heads.map((h) => ({
        name: h.name,
        amount: Math.round(Number(h.amount) * 100) / 100,
      })),
      received_by_name: receivedByName,
    };

    return NextResponse.json(receipt);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
