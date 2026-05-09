import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
});

export interface StudentSearchResult {
  type: "student";
  id: string;
  label: string;
  sublabel: string;
  url: string;
}

export interface ReceiptSearchResult {
  type: "receipt";
  id: string;
  label: string;
  sublabel: string;
  url: string;
}

export type SearchResult = StudentSearchResult | ReceiptSearchResult;

export interface SearchResponse {
  students: StudentSearchResult[];
  receipts: ReceiptSearchResult[];
}

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
    const rawQuery = { q: searchParams.get("q") ?? "" };

    const parsed = searchQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const q = parsed.data.q;
    const term = `%${q}%`;

    const [studentRes, receiptRes] = await Promise.all([
      // Search students by name or admission_no
      supabase
        .from("students")
        .select("id, name, admission_no, grade, section")
        .or(`name.ilike.${term},admission_no.ilike.${term}`)
        .eq("status", "active")
        .limit(5),

      // Search fee transactions by receipt_no
      supabase
        .from("fee_transactions")
        .select(
          "id, receipt_no, payment_date, paid_amount, student_id, students!inner(name, admission_no)"
        )
        .ilike("receipt_no", term)
        .order("payment_date", { ascending: false })
        .limit(5),
    ]);

    const students: StudentSearchResult[] = (studentRes.data ?? []).map(
      (s) => ({
        type: "student" as const,
        id: s.id,
        label: s.name,
        sublabel: `${s.admission_no} • Grade ${s.grade}${s.section}`,
        url: `/dashboard/students`,
      })
    );

    const receipts: ReceiptSearchResult[] = (receiptRes.data ?? []).map(
      (t) => {
        const txn = t as unknown as {
          id: string;
          receipt_no: string;
          payment_date: string;
          paid_amount: number;
          student_id: string;
          students: { name: string; admission_no: string } | Array<{ name: string; admission_no: string }>;
        };
        const studentInfo = Array.isArray(txn.students)
          ? txn.students[0]
          : txn.students;
        return {
          type: "receipt" as const,
          id: txn.id,
          label: txn.receipt_no,
          sublabel: studentInfo
            ? `${studentInfo.name} • ${txn.payment_date}`
            : txn.payment_date,
          url: `/dashboard/fees/receipt/${txn.receipt_no}`,
        };
      }
    );

    const response: SearchResponse = { students, receipts };
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
