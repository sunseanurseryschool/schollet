import type { SupabaseClient } from "@supabase/supabase-js";

const PAGE_SIZE = 1000;

// Fallback only — tables are normally discovered live from the DB schema so
// the export keeps working as the schema evolves.
export const FALLBACK_TABLES = [
  "roles",
  "permissions",
  "role_permissions",
  "staff",
  "students",
  "accounts",
  "account_adjustments",
  "fee_configs",
  "fee_heads",
  "fee_transactions",
  "inventory_items",
  "inventory_transactions",
  "expenses",
  "salary_payments",
  "reason_tags",
  "audit_logs",
];

export interface FullExportPayload {
  meta: {
    app: string;
    exported_at: string;
    exported_by: string;
    table_source: "live-schema" | "fallback-list";
    table_count: number;
    total_rows: number;
    row_counts: Record<string, number>;
    errors?: Record<string, string>;
  };
  data: Record<string, unknown[]>;
}

// PostgREST serves an OpenAPI spec at the API root whose definitions list
// every table/view exposed in the public schema. Supabase restricts this
// endpoint to the service_role key.
export async function discoverTables(): Promise<string[]> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Schema discovery failed with status ${res.status}`);
  }
  const spec = (await res.json()) as { definitions?: Record<string, unknown> };
  const tables = Object.keys(spec.definitions ?? {}).sort();
  if (tables.length === 0) {
    throw new Error("Schema discovery returned no tables");
  }
  return tables;
}

export async function fetchAllRows(
  supabase: SupabaseClient,
  table: string
): Promise<unknown[]> {
  const rows: unknown[] = [];
  let orderById = true;
  let from = 0;
  for (;;) {
    let query = supabase
      .from(table)
      .select("*")
      .range(from, from + PAGE_SIZE - 1);
    if (orderById) query = query.order("id", { ascending: true });
    const { data, error } = await query;
    if (error) {
      // Tables without an `id` column (e.g. composite-key join tables)
      if (orderById && from === 0) {
        orderById = false;
        continue;
      }
      throw new Error(error.message);
    }
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
    from += PAGE_SIZE;
  }
}

export async function buildFullExport(
  supabase: SupabaseClient,
  exportedBy: string
): Promise<FullExportPayload> {
  let tables: string[];
  let tableSource: "live-schema" | "fallback-list" = "live-schema";
  try {
    tables = await discoverTables();
  } catch {
    tables = FALLBACK_TABLES;
    tableSource = "fallback-list";
  }

  const data: Record<string, unknown[]> = {};
  const errors: Record<string, string> = {};
  for (const table of tables) {
    try {
      data[table] = await fetchAllRows(supabase, table);
    } catch (err) {
      errors[table] = err instanceof Error ? err.message : "Unknown error";
    }
  }

  const rowCounts = Object.fromEntries(
    Object.entries(data).map(([table, tableRows]) => [table, tableRows.length])
  );
  const totalRows = Object.values(rowCounts).reduce((sum, n) => sum + n, 0);

  return {
    meta: {
      app: "schollet",
      exported_at: new Date().toISOString(),
      exported_by: exportedBy,
      table_source: tableSource,
      table_count: Object.keys(data).length,
      total_rows: totalRows,
      row_counts: rowCounts,
      ...(Object.keys(errors).length > 0 ? { errors } : {}),
    },
    data,
  };
}
