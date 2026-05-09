import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import {
  createStaffSchema,
  staffListQuerySchema,
} from "@/lib/schemas/staff";
import { listStaff, createStaff } from "@/services/staff";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawQuery = {
      role_id: searchParams.get("role_id") ?? undefined,
      is_active: searchParams.get("is_active") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      per_page: searchParams.get("per_page") ?? undefined,
    };

    const parsed = staffListQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await listStaff(parsed.data);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = createStaffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    // 1. Create auth user via Supabase Admin API
    const signupRes = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/signup`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({
          email: parsed.data.email,
          password: parsed.data.password,
        }),
      }
    );

    if (!signupRes.ok) {
      const err = await signupRes.json();
      const msg = (err as { msg?: string; error_description?: string }).msg
        ?? (err as { error_description?: string }).error_description
        ?? "Failed to create login account";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const authData = (await signupRes.json()) as { user?: { id: string } };
    const authUserId = authData.user?.id;

    if (!authUserId) {
      return NextResponse.json(
        { error: "Failed to create login account — no user ID returned" },
        { status: 500 }
      );
    }

    // 2. Create staff record linked to auth user
    const { password: _pw, ...staffInput } = parsed.data;
    void _pw; // consumed by auth signup above
    const result = await createStaff(staffInput, authUserId);
    if (result.error) {
      const isConflict = result.error.includes("already in use");
      return NextResponse.json(
        { error: result.error },
        { status: isConflict ? 409 : 500 }
      );
    }

    const staff = result.data!;
    await logAudit(user.id, "CREATE", "staff", staff.id, {
      name: staff.name,
      email: staff.email,
      role_id: staff.role_id,
    });

    return NextResponse.json(staff, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
