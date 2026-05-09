/**
 * Generic CSV export utility.
 *
 * Produces an RFC 4180-compliant CSV string and triggers a browser download.
 * A UTF-8 BOM is prepended so Excel opens the file with correct encoding.
 */

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";

  const str = String(value);

  // Wrap in double-quotes if the value contains a comma, double-quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export function exportToCSV<T extends object>(
  data: T[],
  columns: { key: keyof T; label: string }[],
  filename: string
): void {
  const header = columns.map((col) => escapeCsvValue(col.label)).join(",");

  const rows = data.map((row) =>
    columns.map((col) => escapeCsvValue((row as Record<string, unknown>)[col.key as string])).join(",")
  );

  // UTF-8 BOM (\uFEFF) ensures Excel opens with correct encoding on Windows
  const csvContent = "\uFEFF" + [header, ...rows].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute(
    "download",
    filename.endsWith(".csv") ? filename : `${filename}.csv`
  );

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Revoke the object URL after a short delay to allow the download to start
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
}
