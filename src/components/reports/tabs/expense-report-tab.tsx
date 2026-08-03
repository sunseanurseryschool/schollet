"use client";

import { formatINR } from "@/lib/format";
import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ExportButton } from "@/components/export-button";
import { EXPENSE_CATEGORY_VALUES } from "@/lib/schemas/expense";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AnimatedCard,
  StaggerContainer,
  StaggerItem,
  tableRowVariants,
} from "@/components/ui/animated";
import type {
  ExpenseReportResult,
  ExpenseReportRow,
} from "@/services/reports";
import { DateRangeFilter } from "../shared/date-range-filter";
import { SummaryCard } from "../shared/summary-card";
import { TableSkeletonRows } from "../shared/table-skeleton-rows";
import { CATEGORY_BAR_COLOR } from "../shared/constants";
import { currentMonthRange, formatDate } from "../shared/helpers";

interface ExpenseBreakdownLine {
  category: string;
  amount: number;
  percent: number;
}

export function ExpenseReportTab() {
  const defaultRange = currentMonthRange();
  const [dateFrom, setDateFrom] = React.useState(defaultRange.from);
  const [dateTo, setDateTo] = React.useState(defaultRange.to);
  const [categoryFilter, setCategoryFilter] = React.useState<string>("");
  const [data, setData] = React.useState<ExpenseReportResult | null>(null);
  const [breakdown, setBreakdown] = React.useState<
    ExpenseBreakdownLine[] | null
  >(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isBreakdownLoading, setIsBreakdownLoading] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
      });
      if (categoryFilter) params.set("category", categoryFilter);
      const res = await fetch(`/api/reports/expenses?${params.toString()}`);
      if (!res.ok) {
        const b = (await res.json()) as { error?: string };
        throw new Error(b.error ?? "Failed to load expense report");
      }
      setData((await res.json()) as ExpenseReportResult);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo, categoryFilter]);

  // Breakdown ignores the categoryFilter (the whole point is to see all categories).
  const fetchBreakdown = React.useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    setIsBreakdownLoading(true);
    try {
      const params = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
      });
      const res = await fetch(
        `/api/reports/expense-breakdown?${params.toString()}`,
      );
      if (res.ok) {
        setBreakdown((await res.json()) as ExpenseBreakdownLine[]);
      }
    } catch {
      // silent — breakdown is a side-view; main list still renders
    } finally {
      setIsBreakdownLoading(false);
    }
  }, [dateFrom, dateTo]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    void fetchBreakdown();
  }, [fetchBreakdown]);

  return (
    <div className="flex flex-col gap-4">
      <DateRangeFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      >
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-text-secondary">Category</Label>
          <Select
            value={categoryFilter}
            onValueChange={(val) =>
              setCategoryFilter(val == null || val === "__all__" ? "" : val)
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Categories</SelectItem>
              {EXPENSE_CATEGORY_VALUES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </DateRangeFilter>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : data ? (
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StaggerItem>
            <SummaryCard
              label="Total Expenses"
              value={formatINR(data.total)}
              variant="negative"
            />
          </StaggerItem>
          <StaggerItem>
            <SummaryCard
              label="Expense Entries"
              value={String(data.rows.length)}
              variant="neutral"
            />
          </StaggerItem>
        </StaggerContainer>
      ) : null}

      {/* ── Expense Breakdown by category ─────────────────────────────── */}
      <AnimatedCard
        className="rounded-xl ring-1 ring-foreground/10 bg-surface overflow-hidden"
        hover={false}
      >
        <div className="px-5 py-3 border-b border-border-light flex items-baseline justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Expense Breakdown
            </h3>
            <p className="text-xs text-text-secondary">
              Where the money went, by category.
            </p>
          </div>
          {breakdown && breakdown.length > 0 && (
            <p className="text-xs text-text-secondary">
              Total:{" "}
              {formatINR(breakdown.reduce((sum, line) => sum + line.amount, 0))}
            </p>
          )}
        </div>

        {isBreakdownLoading ? (
          <div className="p-5">
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        ) : !breakdown || breakdown.length === 0 ? (
          <div className="py-10 text-center text-sm text-text-secondary">
            No expenses recorded for this period.
          </div>
        ) : (
          <ul className="divide-y divide-border-light/60">
            {breakdown.map((line) => {
              const barColor =
                CATEGORY_BAR_COLOR[line.category] ?? "bg-slate-400";
              return (
                <li
                  key={line.category}
                  className="grid grid-cols-[1fr_auto] items-center gap-x-4 px-5 py-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`inline-block h-2 w-2 shrink-0 rounded-full ${barColor}`}
                    />
                    <span className="text-sm font-medium text-text-primary truncate">
                      {line.category}
                    </span>
                    <span className="text-xs text-text-tertiary tabular-nums">
                      {line.percent.toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-text-primary">
                    {formatINR(line.amount)}
                  </span>
                  <div className="col-span-2">
                    <div className="h-1 w-full rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className={`h-full ${barColor} transition-all`}
                        style={{ width: `${line.percent}%` }}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </AnimatedCard>

      <AnimatedCard
        className="rounded-xl ring-1 ring-foreground/10 bg-surface overflow-hidden"
        hover={false}
      >
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <span className="text-sm font-semibold text-text-primary">
            Expense Report
          </span>
          <ExportButton
            data={data?.rows ?? []}
            columns={[
              { key: "date", label: "Date" },
              { key: "category", label: "Category" },
              { key: "description", label: "Description" },
              { key: "paid_by_name", label: "Paid By" },
              { key: "amount", label: "Amount" },
            ]}
            filename={`expenses-report-${dateFrom}-to-${dateTo}`}
            disabled={isLoading || !data?.rows.length}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Paid By</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows cols={5} />
            ) : data?.rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-text-secondary text-sm"
                >
                  No expenses found for this period.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {data?.rows.map((row: ExpenseReportRow, i: number) => (
                  <motion.tr
                    key={row.id}
                    custom={i}
                    variants={tableRowVariants}
                    initial="hidden"
                    animate="visible"
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="text-sm text-text-secondary">
                      {formatDate(row.date)}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
                        {row.category}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-text-primary max-w-[220px] truncate">
                      {row.description}
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {row.paid_by_name}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-danger">
                      {formatINR(row.amount)}
                    </TableCell>
                  </motion.tr>
                ))}
                {data && data.rows.length > 0 && (
                  <TableRow className="bg-surface-secondary font-semibold">
                    <TableCell colSpan={4} className="text-text-primary">
                      Total
                    </TableCell>
                    <TableCell className="text-right font-bold text-danger">
                      {formatINR(data.total)}
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </AnimatedCard>
    </div>
  );
}
