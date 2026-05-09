export type PermissionCode =
  | "CAN_COLLECT_FEES"
  | "CAN_ADD_EXPENSE"
  | "CAN_VIEW_REPORTS"
  | "CAN_MANAGE_STAFF"
  | "CAN_MANAGE_INVENTORY"
  | "CAN_MANAGE_STUDENTS"
  | "CAN_MANAGE_CONFIG"
  | "CAN_VIEW_AUDIT_LOG";

export interface UserSession {
  id: string;
  email: string;
  role: string;
  permissions: PermissionCode[];
}
