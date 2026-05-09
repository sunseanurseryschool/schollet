import { createClient } from "@/lib/supabase/server";
import type { AuditLog } from "@/types/database";
import type { AuditLogListQuery } from "@/lib/schemas/audit-log";
import type { ServiceResult } from "@/services/student";

export interface AuditLogListResult {
  logs: AuditLog[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export async function listAuditLogs(
  query: AuditLogListQuery
): Promise<ServiceResult<AuditLogListResult>> {
  try {
    const supabase = await createClient();
    const { entity, action, date_from, date_to, page, per_page } = query;
    const from = (page - 1) * per_page;
    const to = from + per_page - 1;

    let builder = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (entity) {
      builder = builder.eq("entity", entity);
    }
    if (action) {
      builder = builder.eq("action", action);
    }
    if (date_from) {
      builder = builder.gte("created_at", date_from);
    }
    if (date_to) {
      // Include the full end day by appending end-of-day time
      builder = builder.lte("created_at", `${date_to}T23:59:59.999Z`);
    }

    const { data, error, count } = await builder;

    if (error) {
      return { data: null, error: error.message };
    }

    const total = count ?? 0;
    return {
      data: {
        logs: (data ?? []) as AuditLog[],
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
