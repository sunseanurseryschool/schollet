"use client";

import { formatINR } from "@/lib/format";
import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
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
import type { DiscountRow } from "@/services/reports";
import { DateRangeFilter } from "../shared/date-range-filter";
import { SummaryCard } from "../shared/summary-card";
import { TableSkeletonRows } from "../shared/table-skeleton-rows";
import { currentMonthRange, formatDate } from "../shared/helpers";

export function DiscountTab() {
  const defaultRange = currentMonthRange();
  const [dateFrom, setDateFrom] = React.useState(defaultRange.from);
  const [dateTo, setDateTo] = React.useState(defaultRange.to);
  const [data, setData] = React.useState<DiscountRow[] | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
      });
      const res = await fetch(`/api/reports/discounts?${params.toString()}`);
      if (!res.ok) {
        const b = (await res.json()) as { error?: string };
        throw new Error(b.error ?? "Failed to load discount report");
      }
      setData((await res.json()) as DiscountRow[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const totalDiscount = data?.reduce((s, r) => s + r.discount_amount, 0) ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <DateRangeFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : data ? (
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StaggerItem>
            <SummaryCard
              label="Total Discounts Given"
              value={formatINR(totalDiscount)}
              variant="negative"
            />
          </StaggerItem>
          <StaggerItem>
            <SummaryCard
              label="Transactions with Discount"
              value={String(data.length)}
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
            Discount Report
          </span>
          <ExportButton
            data={data ?? []}
            columns={[
              { key: "student_name", label: "Student" },
              { key: "admission_no", label: "Adm. No" },
              { key: "grade", label: "Grade" },
              { key: "section", label: "Section" },
              { key: "receipt_no", label: "Receipt No" },
              { key: "payment_date", label: "Date" },
              { key: "discount_amount", label: "Discount" },
              { key: "discount_reason", label: "Reason" },
            ]}
            filename={`discounts-${dateFrom}-to-${dateTo}`}
            disabled={isLoading || !data?.length}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Grade / Section</TableHead>
              <TableHead>Receipt No</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Discount</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows cols={6} />
            ) : data?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-text-secondary text-sm"
                >
                  No discounts found for this period.
                </TableCell>
              </TableRow>
            ) : (
              data?.map((row, i) => (
                <motion.tr
                  key={row.transaction_id}
                  custom={i}
                  variants={tableRowVariants}
                  initial="hidden"
                  animate="visible"
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  <TableCell>
                    <div className="font-medium text-text-primary">
                      {row.student_name}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {row.admission_no}
                    </div>
                  </TableCell>
                  <TableCell className="text-text-secondary text-sm">
                    {row.grade} / {row.section}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-text-secondary">
                    {row.receipt_no}
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary">
                    {formatDate(row.payment_date)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-danger">
                    {formatINR(row.discount_amount)}
                  </TableCell>
                  <TableCell className="text-sm text-text-secondary max-w-[200px] truncate">
                    {row.discount_reason ?? "—"}
                  </TableCell>
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
      </AnimatedCard>
    </div>
  );
}
