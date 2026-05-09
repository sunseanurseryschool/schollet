import { createClient } from "@/lib/supabase/server";
import type { CreateRoleInput, UpdateRoleInput } from "@/lib/schemas/role";
import type { ServiceResult } from "@/services/student";

export interface Permission {
  id: string;
  code: string;
  description: string;
}

export interface RoleWithPermissions {
  id: string;
  name: string;
  created_at: string;
  permissions: Permission[];
}

export async function listRoles(): Promise<
  ServiceResult<RoleWithPermissions[]>
> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("roles")
      .select(
        `
        id,
        name,
        created_at,
        role_permissions(
          permission:permissions(id, code, description)
        )
      `
      )
      .order("created_at", { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    const roles: RoleWithPermissions[] = (data ?? []).map((row) => {
      const rawRole = row as unknown as {
        id: string;
        name: string;
        created_at: string;
        role_permissions: { permission: Permission }[];
      };
      return {
        id: rawRole.id,
        name: rawRole.name,
        created_at: rawRole.created_at,
        permissions: rawRole.role_permissions.map((rp) => rp.permission),
      };
    });

    return { data: roles, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function getRoleById(
  id: string
): Promise<ServiceResult<RoleWithPermissions>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("roles")
      .select(
        `
        id,
        name,
        created_at,
        role_permissions(
          permission:permissions(id, code, description)
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    const rawRole = data as unknown as {
      id: string;
      name: string;
      created_at: string;
      role_permissions: { permission: Permission }[];
    };

    return {
      data: {
        id: rawRole.id,
        name: rawRole.name,
        created_at: rawRole.created_at,
        permissions: rawRole.role_permissions.map((rp) => rp.permission),
      },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function createRole(
  input: CreateRoleInput
): Promise<ServiceResult<RoleWithPermissions>> {
  try {
    const supabase = await createClient();

    // Check name uniqueness
    const { data: existing } = await supabase
      .from("roles")
      .select("id")
      .eq("name", input.name)
      .maybeSingle();

    if (existing) {
      return {
        data: null,
        error: `Role name "${input.name}" already exists`,
      };
    }

    const { data: roleData, error: roleError } = await supabase
      .from("roles")
      .insert({ name: input.name })
      .select("id, name, created_at")
      .single();

    if (roleError) {
      return { data: null, error: roleError.message };
    }

    const role = roleData as { id: string; name: string; created_at: string };

    if (input.permission_ids.length > 0) {
      const inserts = input.permission_ids.map((pid) => ({
        role_id: role.id,
        permission_id: pid,
      }));
      const { error: permError } = await supabase
        .from("role_permissions")
        .insert(inserts);
      if (permError) {
        return { data: null, error: permError.message };
      }
    }

    return getRoleById(role.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function updateRole(
  id: string,
  input: UpdateRoleInput
): Promise<ServiceResult<RoleWithPermissions>> {
  try {
    const supabase = await createClient();

    if (input.name !== undefined) {
      // Check name uniqueness (exclude self)
      const { data: existing } = await supabase
        .from("roles")
        .select("id")
        .eq("name", input.name)
        .neq("id", id)
        .maybeSingle();

      if (existing) {
        return {
          data: null,
          error: `Role name "${input.name}" already exists`,
        };
      }

      const { error: updateError } = await supabase
        .from("roles")
        .update({ name: input.name })
        .eq("id", id);

      if (updateError) {
        return { data: null, error: updateError.message };
      }
    }

    if (input.permission_ids !== undefined) {
      // Replace all permissions: delete existing then insert new
      const { error: deleteError } = await supabase
        .from("role_permissions")
        .delete()
        .eq("role_id", id);

      if (deleteError) {
        return { data: null, error: deleteError.message };
      }

      if (input.permission_ids.length > 0) {
        const inserts = input.permission_ids.map((pid) => ({
          role_id: id,
          permission_id: pid,
        }));
        const { error: insertError } = await supabase
          .from("role_permissions")
          .insert(inserts);
        if (insertError) {
          return { data: null, error: insertError.message };
        }
      }
    }

    return getRoleById(id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function deleteRole(id: string): Promise<ServiceResult<boolean>> {
  try {
    const supabase = await createClient();

    // Check if any active staff are using this role
    const { data: staffUsingRole } = await supabase
      .from("staff")
      .select("id")
      .eq("role_id", id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (staffUsingRole) {
      return {
        data: null,
        error:
          "Cannot delete a role that is assigned to active staff members",
      };
    }

    // Delete role_permissions first (FK constraint)
    const { error: rpError } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", id);

    if (rpError) {
      return { data: null, error: rpError.message };
    }

    const { error } = await supabase.from("roles").delete().eq("id", id);

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function listPermissions(): Promise<ServiceResult<Permission[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("permissions")
      .select("id, code, description")
      .order("code", { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: (data ?? []) as Permission[], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}
