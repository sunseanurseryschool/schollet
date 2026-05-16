"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";

interface DateRangeFilterProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  children?: React.ReactNode;
}

export function DateRangeFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  children,
}: DateRangeFilterProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border-light bg-surface/80 backdrop-blur-sm p-4 shadow-sm">
      <div className="flex flex-col gap-1">
        <Label htmlFor="date-from" className="text-xs text-text-secondary">
          From
        </Label>
        <input
          id="date-from"
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="date-to" className="text-xs text-text-secondary">
          To
        </Label>
        <input
          id="date-to"
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
        />
      </div>
      {children}
    </div>
  );
}
