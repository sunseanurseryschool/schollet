"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export interface DateRangeFilterProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Preset = "today" | "this_week" | "this_month" | "this_year";

function resolvePreset(preset: Preset): { from: string; to: string } {
  const now = new Date();

  switch (preset) {
    case "today": {
      const d = toISODate(now);
      return { from: d, to: d };
    }
    case "this_week": {
      // Week starts on Monday
      const day = now.getDay(); // 0=Sun, 1=Mon, ...
      const diffToMon = (day + 6) % 7;
      const mon = new Date(now);
      mon.setDate(now.getDate() - diffToMon);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return { from: toISODate(mon), to: toISODate(sun) };
    }
    case "this_month": {
      const y = now.getFullYear();
      const m = now.getMonth();
      const firstDay = new Date(y, m, 1);
      const lastDay = new Date(y, m + 1, 0);
      return { from: toISODate(firstDay), to: toISODate(lastDay) };
    }
    case "this_year": {
      const y = now.getFullYear();
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    }
  }
}

const PRESETS: { label: string; value: Preset }[] = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "this_week" },
  { label: "This Month", value: "this_month" },
  { label: "This Year", value: "this_year" },
];

export function DateRangeFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: DateRangeFilterProps) {
  function handlePreset(preset: Preset) {
    const { from, to } = resolvePreset(preset);
    onDateFromChange(from);
    onDateToChange(to);
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-surface p-4">
      {/* Preset buttons */}
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((p) => (
          <Button
            key={p.value}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePreset(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Divider */}
      <div className="hidden sm:block h-6 w-px bg-border" />

      {/* From date */}
      <div className="flex flex-col gap-1">
        <Label htmlFor="drf-date-from" className="text-xs text-text-secondary">
          From
        </Label>
        <input
          id="drf-date-from"
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
        />
      </div>

      {/* To date */}
      <div className="flex flex-col gap-1">
        <Label htmlFor="drf-date-to" className="text-xs text-text-secondary">
          To
        </Label>
        <input
          id="drf-date-to"
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
        />
      </div>
    </div>
  );
}
