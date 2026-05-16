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
import { GRADES, SECTIONS } from "@/lib/constants";
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
import type { CollectionRow } from "@/services/reports";
import { DateRangeFilter } from "../shared/date-range-filter";
import { SummaryCard } from "../shared/summary-card";
import { TableSkeletonRows } from "../shared/table-skeleton-rows";
import { currentMonthRange } from "../shared/helpers";

export function CollectionTab() {
  const defaultRange = currentMonthRange();
  const [dateFrom, setDateFrom] = React.useState(defaultRange.from);
  const [dateTo, setDateTo] = React.useState(defaultRange.to);
  const [gradeFilter, setGradeFilter] = React.useState<string>("");
  const [sectionFilter, setSectionFilter] = React.useState<string>("");
  const [data, setData] = React.useState<CollectionRow[] | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
      });
      if (gradeFilter) params.set("grade", gradeFilter);
      if (sectionFilter) params.set("section", sectionFilter);
      const res = await fetch(`/api/reports/collection?${params.toString()}`);
      if (!res.ok) {
        const b = (await res.json()) as { error?: string };
        throw new Error(b.error ?? "Failed to load collection report");
      }
      setData((await res.json()) as CollectionRow[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo, gradeFilter, sectionFilter]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const totalCollected = data?.reduce((s, r) => s + r.total_collected, 0) ?? 0;
  const totalStudents = data?.reduce((s, r) => s + r.student_count, 0) ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <DateRangeFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      >
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-text-secondary">Grade</Label>
          <Select
            value={gradeFilter}
            onValueChange={(val) =>
              setGradeFilter(val == null || val === "__all__" ? "" : val)
            }
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="All Grades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Grades</SelectItem>
              {GRADES.map((g) => (
                <SelectItem key={g} value={g}>
                  Grade {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-text-secondary">Section</Label>
          <Select
            value={sectionFilter}
            onValueChange={(val) =>
              setSectionFilter(val == null || val === "__all__" ? "" : val)
            }
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="All Sections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Sections</SelectItem>
              {SECTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  Section {s}
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
              label="Total Collected"
              value={formatINR(totalCollected)}
              variant="positive"
            />
          </StaggerItem>
          <StaggerItem>
            <SummaryCard
              label="Students Paid"
              value={String(totalStudents)}
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
            Collection Report
          </span>
          <ExportButton
            data={data ?? []}
            columns={[
              { key: "grade", label: "Grade" },
              { key: "section", label: "Section" },
              { key: "student_count", label: "Students" },
              { key: "total_collected", label: "Total Collected" },
            ]}
            filename={`collection-${dateFrom}-to-${dateTo}`}
            disabled={isLoading || !data?.length}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Grade</TableHead>
              <TableHead>Section</TableHead>
              <TableHead className="text-right">Students</TableHead>
              <TableHead className="text-right">Total Collected</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows cols={4} />
            ) : data?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-text-secondary text-sm"
                >
                  No collections found for this period.
                </TableCell>
              </TableRow>
            ) : (
              data?.map((row, i) => (
                <motion.tr
                  key={`${row.grade}-${row.section}`}
                  custom={i}
                  variants={tableRowVariants}
                  initial="hidden"
                  animate="visible"
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  <TableCell className="font-medium">{row.grade}</TableCell>
                  <TableCell>{row.section}</TableCell>
                  <TableCell className="text-right">
                    {row.student_count}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-success">
                    {formatINR(row.total_collected)}
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
