import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

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
      account_id: transaction.account_id,
      paid_amount: transaction.paid_amount,
      discount_amount: transaction.discount_amount,
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
