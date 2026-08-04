import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { buildFullExport } from "@/lib/backup";
import { todayISO } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "Admin") {
      return NextResponse.json(
        { error: "Only admins can export data" },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const payload = await buildFullExport(supabase, user.email);

    await logAudit(user.id, "EXPORT", "system", "full-export", {
      table_source: payload.meta.table_source,
      table_count: payload.meta.table_count,
      total_rows: payload.meta.total_rows,
      failed_tables: Object.keys(payload.meta.errors ?? {}),
    });

    const filename = `schollet-export-${todayISO()}.json`;
    return new NextResponse(JSON.stringify(payload), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
