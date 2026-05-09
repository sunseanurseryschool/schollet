import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { updateStudentSchema } from "@/lib/schemas/student";
import {
  getStudentById,
  updateStudent,
  deleteStudent,
} from "@/services/student";

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
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    const result = await getStudentById(id);
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
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = updateStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    // Verify student exists before updating
    const existing = await getStudentById(id);
    if (!existing.data) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const result = await updateStudent(id, parsed.data);
    if (result.error) {
      const isConflict = result.error.includes("already in use");
      return NextResponse.json(
        { error: result.error },
        { status: isConflict ? 409 : 500 }
      );
    }

    const student = result.data!;
    await logAudit(user.id, "UPDATE", "student", id, {
      changes: parsed.data,
      previous: {
        name: existing.data.name,
        grade: existing.data.grade,
        section: existing.data.section,
        status: existing.data.status,
      },
    });

    return NextResponse.json(student);
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
        { error: "Student ID is required" },
        { status: 400 }
      );
    }

    // Capture student details before deletion for audit
    const existing = await getStudentById(id);
    if (!existing.data) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const result = await deleteStudent(id);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    await logAudit(user.id, "DELETE", "student", id, {
      admission_no: existing.data.admission_no,
      name: existing.data.name,
      grade: existing.data.grade,
      section: existing.data.section,
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
