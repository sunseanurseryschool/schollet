import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { updateInventoryItemSchema } from "@/lib/schemas/inventory";
import {
  getInventoryItemById,
  updateInventoryItem,
  deleteInventoryItem,
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

    const result = await getInventoryItemById(id);
    if (result.error) {
      const isNotFound = result.error.includes("No rows");
      return NextResponse.json(
        { error: result.error },
        { status: isNotFound ? 404 : 500 }
      );
    }

    return NextResponse.json(result.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
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

    const parsed = updateInventoryItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const existing = await getInventoryItemById(id);
    if (!existing.data) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    const result = await updateInventoryItem(id, parsed.data);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const item = result.data!;
    await logAudit(user.id, "UPDATE", "inventory_item", id, {
      changes: parsed.data,
      previous: {
        name: existing.data.name,
        unit: existing.data.unit,
        min_quantity: existing.data.min_quantity,
      },
    });

    return NextResponse.json(item);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
    if (!id) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 }
      );
    }

    const existing = await getInventoryItemById(id);
    if (!existing.data) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    const result = await deleteInventoryItem(id);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    await logAudit(user.id, "DELETE", "inventory_item", id, {
      name: existing.data.name,
      unit: existing.data.unit,
      quantity: existing.data.quantity,
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
