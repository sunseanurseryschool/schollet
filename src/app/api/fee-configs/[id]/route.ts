import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { updateFeeConfigSchema } from "@/lib/schemas/fee-config";
import {
  getFeeConfigById,
  updateFeeConfig,
  deleteFeeConfig,
} from "@/services/fee-config";

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

    const result = await getFeeConfigById(id);
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = updateFeeConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    // Verify config exists
    const existing = await getFeeConfigById(id);
    if (!existing.data) {
      return NextResponse.json(
        { error: "Fee config not found" },
        { status: 404 }
      );
    }

    const result = await updateFeeConfig(id, parsed.data);
    if (result.error) {
      const isConflict = result.error.includes("already exists");
      return NextResponse.json(
        { error: result.error },
        { status: isConflict ? 409 : 500 }
      );
    }

    const config = result.data!;
    await logAudit(user.id, "UPDATE", "fee_config", id, {
      changes: {
        grade: parsed.data.grade,
        academic_year: parsed.data.academic_year,
        total_fee: parsed.data.total_fee,
        head_count: parsed.data.fee_heads.length,
      },
      previous: {
        grade: existing.data.grade,
        academic_year: existing.data.academic_year,
        total_fee: existing.data.total_fee,
        head_count: existing.data.fee_heads.length,
      },
    });

    return NextResponse.json(config);
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

    // Capture details before deletion for audit
    const existing = await getFeeConfigById(id);
    if (!existing.data) {
      return NextResponse.json(
        { error: "Fee config not found" },
        { status: 404 }
      );
    }

    const result = await deleteFeeConfig(id);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    await logAudit(user.id, "DELETE", "fee_config", id, {
      grade: existing.data.grade,
      academic_year: existing.data.academic_year,
      total_fee: existing.data.total_fee,
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
