"use client";

import * as React from "react";
import { DownloadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ExportMeta {
  table_count: number;
  total_rows: number;
  errors?: Record<string, string>;
}

export function SettingsView() {
  const [isExporting, setIsExporting] = React.useState(false);

  async function handleExport() {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const res = await fetch("/api/settings/export");
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.error(body?.error ?? "Export failed");
        return;
      }

      const payload = (await res.json()) as { meta: ExportMeta };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `schollet-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const failedTables = Object.keys(payload.meta.errors ?? {});
      if (failedTables.length > 0) {
        toast.warning(
          `Exported with ${failedTables.length} table(s) skipped: ${failedTables.join(", ")}`
        );
      } else {
        toast.success(
          `Exported ${payload.meta.total_rows} rows from ${payload.meta.table_count} tables`
        );
      }
    } catch {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Data Export</CardTitle>
          <CardDescription>
            Download a full backup of all school data as a single JSON file —
            students, fees, accounts, expenses, inventory, staff and audit
            logs. New tables and columns are included automatically as the
            database grows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} disabled={isExporting}>
            <DownloadIcon className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export all data (JSON)"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
