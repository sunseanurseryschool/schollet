import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { brandingSchema } from "@/lib/schemas/settings";
import { getBranding, updateBranding } from "@/services/settings";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(await getBranding());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "Admin") {
      return NextResponse.json(
        { error: "Only admins can update branding" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = brandingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid branding", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const result = await updateBranding(parsed.data);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    await logAudit(user.id, "UPDATE", "system", "branding", {
      school_name: parsed.data.school_name,
      has_logo: parsed.data.logo_data_url !== "",
    });

    return NextResponse.json(result.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
