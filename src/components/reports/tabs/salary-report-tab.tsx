"use client";

import { formatINR } from "@/lib/format";
import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ExportButton } from "@/components/export-button";
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
  SalaryReportResult,
  SalaryReportRow,
} from "@/services/reports";
import { SummaryCard } from "../shared/summary-card";
import { TableSkeletonRows } from "../shared/table-skeleton-rows";
import { currentYearMonth, formatDate } from "../shared/helpers";

export function SalaryReportTab() {
  const [monthFilter, setMonthFilter] =
    React.useState<string>(currentYearMonth());
  const [data, setData] = React.useState<SalaryReportResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (monthFilter) params.set("month", monthFilter);
      const res = await fetch(`/api/reports/salary?${params.toString()}`);
      if (!res.ok) {
        const b = (await res.json()) as { error?: string };
        throw new Error(b.error ?? "Failed to load salary report");
      }
      setData((await res.json()) as SalaryReportResult);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setIsLoading(false);
    }
  }, [monthFilter]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border-light bg-surface/80 backdrop-blur-sm p-4 shadow-sm">
        <div className="flex flex-col gap-1">
          <Label htmlFor="salary-month" className="text-xs text-text-secondary">
            Month
          </Label>
          <input
            id="salary-month"
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : data ? (
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StaggerItem>
            <SummaryCard
              label="Total Salary Paid"
              value={formatINR(data.total)}
              variant="negative"
            />
          </StaggerItem>
          <StaggerItem>
            <SummaryCard
              label="Payments Recorded"
              value={String(data.rows.length)}
              variant="neutral"
            />
          </StaggerItem>
        </StaggerContainer>
      ) : null}

      <AnimatedCard
        className="rounded-xl ring-1 ring-foreground/10 bg-surface overflow-hidden"
        hover={false}
      >
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <span className="text-sm font-semibold text-text-primary">
            Salary Report
          </span>
          <ExportButton
            data={data?.rows ?? []}
            columns={[
              { key: "staff_name", label: "Staff Name" },
              { key: "month", label: "Month" },
              { key: "payment_date", label: "Payment Date" },
              { key: "notes", label: "Notes" },
              { key: "amount", label: "Amount" },
            ]}
            filename={monthFilter ? `salary-${monthFilter}` : "salary-report"}
            disabled={isLoading || !data?.rows.length}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff Name</TableHead>
              <TableHead>Month</TableHead>
              <TableHead>Payment Date</TableHead>
              <TableHead>Notes</TableHead>
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
                  No salary payments found.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {data?.rows.map((row: SalaryReportRow, i: number) => (
                  <motion.tr
                    key={row.id}
                    custom={i}
                    variants={tableRowVariants}
                    initial="hidden"
                    animate="visible"
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">
                      {row.staff_name}
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {row.month}
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {formatDate(row.payment_date)}
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary max-w-[180px] truncate">
                      {row.notes ?? "—"}
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
