import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { feeDuesQuerySchema } from "@/lib/schemas/fee-dues";
import { getDetailedDuesReport } from "@/services/reports";

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
      academic_year: searchParams.get("academic_year") ?? undefined,
    };

    const parsed = feeDuesQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await getDetailedDuesReport(
      parsed.data.grade,
      parsed.data.section,
      parsed.data.academic_year
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
