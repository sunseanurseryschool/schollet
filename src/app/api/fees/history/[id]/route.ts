import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { reverseJournalEntry } from "@/services/ledger";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    // Fetch the transaction before deleting
    const { data: transaction, error: fetchError } = await supabase
      .from("fee_transactions")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !transaction) {
      return NextResponse.json(
        { error: "Fee transaction not found" },
        { status: 404 }
      );
    }

    // Reverse the journal entry linked to this transaction
    const { data: journalEntry } = await supabase
      .from("journal_entries")
      .select("id")
      .eq("reference_type", "FEE")
      .eq("reference_id", id)
      .maybeSingle();

    if (journalEntry) {
      const today = new Date().toISOString().slice(0, 10);
      await reverseJournalEntry(
        journalEntry.id,
        `Reversal — deleted fee payment ${transaction.receipt_no}`,
        today
      );
    }

    // Delete the fee transaction
    const { error: deleteError } = await supabase
      .from("fee_transactions")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    await logAudit(user.id, "DELETE", "fee_transaction", id, {
      receipt_no: transaction.receipt_no,
      student_id: transaction.student_id,
      paid_amount: transaction.paid_amount,
      discount_amount: transaction.discount_amount,
      payment_mode: transaction.payment_mode,
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
