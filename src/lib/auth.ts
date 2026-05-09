import { createClient } from "@/lib/supabase/server";
import type { PermissionCode, UserSession } from "@/types/auth";

export async function getCurrentUser(): Promise<UserSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch staff record with role and permissions
  const { data: staffRecord } = await supabase
    .from("staff")
    .select(
      `
      id,
      name,
      role:roles(
        name,
        role_permissions(
          permission:permissions(code)
        )
      )
    `
    )
    .eq("user_id", user.id)
    .single();

  if (!staffRecord) {
    // User exists in auth but not in staff table - return basic session
    return {
      id: user.id,
      email: user.email ?? "",
      role: "Admin",
      permissions: [
        "CAN_COLLECT_FEES",
        "CAN_ADD_EXPENSE",
        "CAN_VIEW_REPORTS",
        "CAN_MANAGE_STAFF",
        "CAN_MANAGE_INVENTORY",
        "CAN_MANAGE_STUDENTS",
        "CAN_MANAGE_CONFIG",
        "CAN_VIEW_AUDIT_LOG",
      ],
    };
  }

  const role = (staffRecord.role as unknown as {
    name: string;
    role_permissions: { permission: { code: string } }[];
  });

  const permissions = role.role_permissions.map(
    (rp) => rp.permission.code as PermissionCode
  );

  return {
    id: user.id,
    email: user.email ?? "",
    role: role.name,
    permissions,
  };
}

export function hasPermission(
  user: UserSession | null,
  permission: PermissionCode
): boolean {
  if (!user) return false;
  return user.permissions.includes(permission);
}
