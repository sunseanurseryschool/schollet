import { createClient } from "@/lib/supabase/server";
import type { Student, Grade, Section, StudentStatus } from "@/types/database";
import {
  normalizeStudentForSubmit,
  type CreateStudentInput,
  type UpdateStudentInput,
  type StudentListQuery,
} from "@/lib/schemas/student";

export interface StudentListResult {
  students: Student[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

export async function listStudents(
  query: StudentListQuery
): Promise<ServiceResult<StudentListResult>> {
  try {
    const supabase = await createClient();
    const { grade, section, status, search, page, per_page } = query;
    const from = (page - 1) * per_page;
    const to = from + per_page - 1;

    let builder = supabase
      .from("students")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (grade) {
      builder = builder.eq("grade", grade as Grade);
    }
    if (section) {
      builder = builder.eq("section", section as Section);
    }
    if (status) {
      builder = builder.eq("status", status as StudentStatus);
    }
    if (search && search.trim().length > 0) {
      const term = `%${search.trim()}%`;
      builder = builder.or(
        `name.ilike.${term},admission_no.ilike.${term},father_name.ilike.${term},mother_name.ilike.${term},father_mobile.ilike.${term},mother_mobile.ilike.${term}`,
      );
    }

    const { data, error, count } = await builder;

    if (error) {
      return { data: null, error: error.message };
    }

    const total = count ?? 0;
    return {
      data: {
        students: (data ?? []) as Student[],
        total,
        page,
        per_page,
        total_pages: Math.ceil(total / per_page),
      },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function getStudentById(
  id: string
): Promise<ServiceResult<Student>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }
    if (!data) {
      return { data: null, error: "Student not found" };
    }
    return { data: data as Student, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function createStudent(
  input: CreateStudentInput
): Promise<ServiceResult<Student>> {
  try {
    const supabase = await createClient();

    // Auto-generate admission number if not provided
    let admissionNo = input.admission_no?.trim() || "";
    if (!admissionNo) {
      const year = new Date().getFullYear();
      const prefix = `ADM-${year}-`;
      const { data: last } = await supabase
        .from("students")
        .select("admission_no")
        .like("admission_no", `${prefix}%`)
        .order("admission_no", { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextSeq = 1;
      if (last?.admission_no) {
        const suffix = last.admission_no.slice(prefix.length);
        const parsed = parseInt(suffix, 10);
        if (!isNaN(parsed)) nextSeq = parsed + 1;
      }
      admissionNo = `${prefix}${String(nextSeq).padStart(4, "0")}`;
    }

    // Check admission_no uniqueness at service layer
    const { data: existing } = await supabase
      .from("students")
      .select("id")
      .eq("admission_no", admissionNo)
      .maybeSingle();

    if (existing) {
      return {
        data: null,
        error: `Admission number "${admissionNo}" is already in use`,
      };
    }

    const { data, error } = await supabase
      .from("students")
      .insert({
        ...normalizeStudentForSubmit(input),
        admission_no: admissionNo,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as Student, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function updateStudent(
  id: string,
  input: UpdateStudentInput
): Promise<ServiceResult<Student>> {
  try {
    const supabase = await createClient();

    // If admission_no is changing, verify uniqueness
    if (input.admission_no !== undefined) {
      const { data: existing } = await supabase
        .from("students")
        .select("id")
        .eq("admission_no", input.admission_no)
        .neq("id", id)
        .maybeSingle();

      if (existing) {
        return {
          data: null,
          error: `Admission number "${input.admission_no}" is already in use`,
        };
      }
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [key, value] of Object.entries(input)) {
      if (value === "") {
        patch[key] = null;
      } else if (typeof value === "number" && Number.isNaN(value)) {
        patch[key] = null;
      } else {
        patch[key] = value;
      }
    }

    const { data, error } = await supabase
      .from("students")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as Student, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function deleteStudent(
  id: string
): Promise<ServiceResult<boolean>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("students").delete().eq("id", id);

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}
