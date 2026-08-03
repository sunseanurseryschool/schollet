import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ReceiptData } from "@/app/api/fees/receipt/[receiptNo]/route";
import { PrintReceiptView } from "@/components/fees/print-receipt-view";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ receiptNo: string }>;
}) {
  const { receiptNo } = await props.params;
  return {
    title: `Receipt ${receiptNo} | Schollet`,
  };
}

export default async function ReceiptPage(props: {
  params: Promise<{ receiptNo: string }>;
}) {
  const { receiptNo } = await props.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // Fetch receipt data from the API layer via service (server-side, no HTTP round-trip)
  const { getStudentById } = await import("@/services/student");
  const { getFeeConfigById } = await import("@/services/fee-config");
  const { getBranding } = await import("@/services/settings");

  const { data: txData } = await supabase
    .from("fee_transactions")
    .select("*")
    .eq("receipt_no", receiptNo)
    .maybeSingle();

  if (!txData) {
    notFound();
  }

  const [studentResult, configResult, branding] = await Promise.all([
    getStudentById(txData.student_id as string),
    getFeeConfigById(txData.fee_config_id as string),
    getBranding(),
  ]);

  if (!studentResult.data || !configResult.data) {
    notFound();
  }

  const student = studentResult.data;
  const feeConfig = configResult.data;

  // Compute cumulative balance remaining
  const { data: allTx } = await supabase
    .from("fee_transactions")
    .select("paid_amount, discount_amount")
    .eq("student_id", txData.student_id as string)
    .eq("fee_config_id", txData.fee_config_id as string);

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

  // Resolve staff name
  let receivedByName: string | null = null;
  const { data: staffRow } = await supabase
    .from("staff")
    .select("name")
    .eq("id", txData.received_by as string)
    .maybeSingle();

  if (staffRow) {
    receivedByName = (staffRow as { name: string }).name;
  }

  // Resolve account name
  let accountName = "—";
  const { data: accountRow } = await supabase
    .from("accounts")
    .select("name")
    .eq("id", txData.account_id as string)
    .maybeSingle();
  if (accountRow) {
    accountName = (accountRow as { name: string }).name;
  }

  const receipt: ReceiptData = {
    receipt_no: txData.receipt_no as string,
    payment_date: txData.payment_date as string,
    account_name: accountName,
    paid_amount: Math.round(Number(txData.paid_amount) * 100) / 100,
    discount_amount: Math.round(Number(txData.discount_amount) * 100) / 100,
    discount_reason: txData.discount_reason as string | null,
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

  return <PrintReceiptView receipt={receipt} branding={branding} />;
}
