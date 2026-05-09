import { createClient } from "@/lib/supabase/server";
import type {
  CreateStaffInput,
  UpdateStaffInput,
  StaffListQuery,
} from "@/lib/schemas/staff";
import type { ServiceResult } from "@/services/student";

export interface StaffMember {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  role_id: string;
  salary: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  role?: { id: string; name: string } | null;
}

export interface StaffListResult {
  staff: StaffMember[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export async function listStaff(
  query: StaffListQuery
): Promise<ServiceResult<StaffListResult>> {
  try {
    const supabase = await createClient();
    const { role_id, is_active, search, page, per_page } = query;
    const from = (page - 1) * per_page;
    const to = from + per_page - 1;

    let builder = supabase
      .from("staff")
      .select("*, role:roles(id, name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (role_id !== undefined) {
      builder = builder.eq("role_id", role_id);
    }
    if (is_active !== undefined) {
      builder = builder.eq("is_active", is_active);
    }
    if (search && search.trim().length > 0) {
      const term = `%${search.trim()}%`;
      builder = builder.or(`name.ilike.${term},email.ilike.${term}`);
    }

    const { data, error, count } = await builder;

    if (error) {
      return { data: null, error: error.message };
    }

    const total = count ?? 0;
    return {
      data: {
        staff: (data ?? []) as StaffMember[],
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

export async function getStaffById(
  id: string
): Promise<ServiceResult<StaffMember>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("staff")
      .select("*, role:roles(id, name)")
      .eq("id", id)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as StaffMember, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function createStaff(
  input: Omit<CreateStaffInput, "password">,
  userId?: string
): Promise<ServiceResult<StaffMember>> {
  try {
    const supabase = await createClient();

    // Check email uniqueness
    const { data: existing } = await supabase
      .from("staff")
      .select("id")
      .eq("email", input.email)
      .maybeSingle();

    if (existing) {
      return {
        data: null,
        error: `Email "${input.email}" is already in use`,
      };
    }

    const { data, error } = await supabase
      .from("staff")
      .insert({
        name: input.name,
        email: input.email,
        role_id: input.role_id,
        salary: input.salary,
        is_active: true,
        ...(userId ? { user_id: userId } : {}),
      })
      .select("*, role:roles(id, name)")
      .single();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as StaffMember, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function updateStaff(
  id: string,
  input: Omit<UpdateStaffInput, "password">
): Promise<ServiceResult<StaffMember>> {
  try {
    const supabase = await createClient();

    // If email is changing, verify uniqueness
    if (input.email !== undefined) {
      const { data: existing } = await supabase
        .from("staff")
        .select("id")
        .eq("email", input.email)
        .neq("id", id)
        .maybeSingle();

      if (existing) {
        return {
          data: null,
          error: `Email "${input.email}" is already in use`,
        };
      }
    }

    const { data, error } = await supabase
      .from("staff")
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*, role:roles(id, name)")
      .single();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as StaffMember, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function deactivateStaff(
  id: string
): Promise<ServiceResult<StaffMember>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("staff")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*, role:roles(id, name)")
      .single();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as StaffMember, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}
