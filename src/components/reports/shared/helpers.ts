import { todayParts } from "@/lib/dates";

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function currentMonthRange(): { from: string; to: string } {
  const { year, month } = todayParts();
  const m = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${year}-${m}-01`,
    to: `${year}-${m}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function currentYearMonth(): string {
  const { year, month } = todayParts();
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function compactINR(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 10_000_000) return `₹${(value / 10_000_000).toFixed(1)}Cr`;
  if (abs >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`;
  if (abs >= 1_000) return `₹${(value / 1_000).toFixed(1)}k`;
  return `₹${value}`;
}
