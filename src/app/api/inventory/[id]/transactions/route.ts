import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { createInventoryTransactionSchema } from "@/lib/schemas/inventory";
import {
  getInventoryItemById,
  listInventoryTransactions,
  recordInventoryTransaction,
} from "@/services/inventory";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
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
    if (!id) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 }
      );
    }

    // Verify item exists
    const itemResult = await getInventoryItemById(id);
    if (!itemResult.data) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    const result = await listInventoryTransactions(id);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
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
    if (!id) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = createInventoryTransactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const result = await recordInventoryTransaction(id, parsed.data);
    if (result.error) {
      // Insufficient stock → 409 Conflict
      const isStockError = result.error.includes("Insufficient stock");
      return NextResponse.json(
        { error: result.error },
        { status: isStockError ? 409 : 500 }
      );
    }

    const { transaction, updatedItem } = result.data!;

    await logAudit(
      user.id,
      `INVENTORY_${parsed.data.type}`,
      "inventory_transaction",
      transaction.id,
      {
        item_id: id,
        item_name: updatedItem.name,
        type: parsed.data.type,
        quantity: parsed.data.quantity,
        new_quantity: updatedItem.quantity,
        is_purchase: parsed.data.is_purchase,
        amount: parsed.data.amount ?? null,
        date: parsed.data.date,
      }
    );

    return NextResponse.json({ transaction, updatedItem }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
