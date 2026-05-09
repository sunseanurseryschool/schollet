import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { updateRoleSchema } from "@/lib/schemas/role";
import { getRoleById, updateRole, deleteRole } from "@/services/role";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

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
        { error: "Role ID is required" },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = updateRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const existing = await getRoleById(id);
    if (!existing.data) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    const result = await updateRole(id, parsed.data);
    if (result.error) {
      const isConflict = result.error.includes("already exists");
      return NextResponse.json(
        { error: result.error },
        { status: isConflict ? 409 : 500 }
      );
    }

    const role = result.data!;
    await logAudit(user.id, "UPDATE", "role", id, {
      changes: parsed.data,
      previous: {
        name: existing.data.name,
        permission_ids: existing.data.permissions.map((p) => p.id),
      },
    });

    return NextResponse.json(role);
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
        { error: "Role ID is required" },
        { status: 400 }
      );
    }

    const existing = await getRoleById(id);
    if (!existing.data) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    const result = await deleteRole(id);
    if (result.error) {
      const isConflict = result.error.includes("assigned to active staff");
      return NextResponse.json(
        { error: result.error },
        { status: isConflict ? 409 : 500 }
      );
    }

    await logAudit(user.id, "DELETE", "role", id, {
      name: existing.data.name,
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
