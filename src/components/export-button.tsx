"use client";

import * as React from "react";
import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToCSV } from "@/lib/export";

interface ExportButtonProps<T extends object> {
  data: T[];
  columns: { key: keyof T; label: string }[];
  filename: string;
  disabled?: boolean;
}

export function ExportButton<T extends object>({
  data,
  columns,
  filename,
  disabled = false,
}: ExportButtonProps<T>) {
  const [isExporting, setIsExporting] = React.useState(false);

  function handleExport() {
    if (isExporting || disabled) return;
    setIsExporting(true);
    try {
      exportToCSV(
        data as unknown as Record<string, unknown>[],
        columns as { key: string; label: string }[],
        filename
      );
    } finally {
      // Brief loading state so users get visual feedback
      setTimeout(() => setIsExporting(false), 600);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled || isExporting}
      onClick={handleExport}
    >
      <DownloadIcon className="h-4 w-4" />
      {isExporting ? "Exporting..." : "Export CSV"}
    </Button>
  );
}
