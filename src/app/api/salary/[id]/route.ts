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

    // Fetch the payment before deleting
    const { data: payment, error: fetchError } = await supabase
      .from("salary_payments")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !payment) {
      return NextResponse.json(
        { error: "Salary payment not found" },
        { status: 404 }
      );
    }

    // Reverse the journal entry linked to this payment
    const { data: journalEntry } = await supabase
      .from("journal_entries")
      .select("id")
      .eq("reference_type", "SALARY")
      .eq("reference_id", payment.staff_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (journalEntry) {
      const today = new Date().toISOString().slice(0, 10);
      await reverseJournalEntry(
        journalEntry.id,
        `Reversal — deleted salary payment for ${payment.month}`,
        today
      );
    }

    // Delete the salary payment
    const { error: deleteError } = await supabase
      .from("salary_payments")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    await logAudit(user.id, "DELETE", "salary_payment", id, {
      staff_id: payment.staff_id,
      month: payment.month,
      amount: payment.amount,
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
