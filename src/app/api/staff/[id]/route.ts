import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { updateStaffSchema } from "@/lib/schemas/staff";
import {
  getStaffById,
  updateStaff,
  deactivateStaff,
} from "@/services/staff";

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
        { error: "Staff ID is required" },
        { status: 400 }
      );
    }

    const result = await getStaffById(id);
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
        { error: "Staff ID is required" },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = updateStaffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const existing = await getStaffById(id);
    if (!existing.data) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    // Handle password: update existing auth user or create new one
    if (parsed.data.password) {
      const staffEmail = parsed.data.email ?? existing.data.email;

      if (existing.data.user_id) {
        // Update existing auth user's password
        const updateRes = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${existing.data.user_id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
            },
            body: JSON.stringify({ password: parsed.data.password }),
          }
        );
        if (!updateRes.ok) {
          const err = await updateRes.json().catch(() => ({}));
          return NextResponse.json(
            { error: (err as { msg?: string }).msg ?? "Failed to update password" },
            { status: 500 }
          );
        }
      } else {
        // Staff has no auth account — create one and link it
        const signupRes = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/signup`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            },
            body: JSON.stringify({ email: staffEmail, password: parsed.data.password }),
          }
        );
        if (!signupRes.ok) {
          const err = await signupRes.json().catch(() => ({}));
          return NextResponse.json(
            { error: (err as { msg?: string }).msg ?? "Failed to create login account" },
            { status: 500 }
          );
        }
        const authData = (await signupRes.json()) as { user?: { id: string } };
        if (authData.user?.id) {
          // Link the auth user to the staff record
          await supabase.from("staff").update({ user_id: authData.user.id }).eq("id", id);
        }
      }
    }

    // Remove password before passing to staff update
    const { password: _pw, ...staffUpdateData } = parsed.data;
    void _pw;

    const result = await updateStaff(id, staffUpdateData);
    if (result.error) {
      const isConflict = result.error.includes("already in use");
      return NextResponse.json(
        { error: result.error },
        { status: isConflict ? 409 : 500 }
      );
    }

    const staff = result.data!;
    await logAudit(user.id, "UPDATE", "staff", id, {
      changes: parsed.data,
      previous: {
        name: existing.data.name,
        email: existing.data.email,
        role_id: existing.data.role_id,
      },
    });

    return NextResponse.json(staff);
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
        { error: "Staff ID is required" },
        { status: 400 }
      );
    }

    const existing = await getStaffById(id);
    if (!existing.data) {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    const result = await deactivateStaff(id);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    await logAudit(user.id, "DEACTIVATE", "staff", id, {
      name: existing.data.name,
      email: existing.data.email,
      role_id: existing.data.role_id,
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
