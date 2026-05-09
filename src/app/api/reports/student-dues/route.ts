import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { studentDuesQuerySchema } from "@/lib/schemas/report";
import { getStudentDuesReport } from "@/services/reports";

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
      grade: searchParams.get("grade") ?? undefined,
      section: searchParams.get("section") ?? undefined,
    };

    const parsed = studentDuesQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await getStudentDuesReport(
      parsed.data.grade,
      parsed.data.section
    );

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
