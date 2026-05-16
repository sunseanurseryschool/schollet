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
import { Button } from "@/components/ui/button";
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
import type { StudentDuesRow } from "@/services/reports";
import { SummaryCard } from "../shared/summary-card";
import { TableSkeletonRows } from "../shared/table-skeleton-rows";

export function StudentDuesTab() {
  const [gradeFilter, setGradeFilter] = React.useState<string>("");
  const [sectionFilter, setSectionFilter] = React.useState<string>("");
  const [data, setData] = React.useState<StudentDuesRow[] | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (gradeFilter) params.set("grade", gradeFilter);
      if (sectionFilter) params.set("section", sectionFilter);
      const res = await fetch(`/api/reports/student-dues?${params.toString()}`);
      if (!res.ok) {
        const b = (await res.json()) as { error?: string };
        throw new Error(b.error ?? "Failed to load student dues");
      }
      setData((await res.json()) as StudentDuesRow[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setIsLoading(false);
    }
  }, [gradeFilter, sectionFilter]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const totalPending =
    data?.reduce((s, r) => s + Math.max(r.pending, 0), 0) ?? 0;
  const studentsWithDues = data?.filter((r) => r.pending > 0).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border-light bg-surface/80 backdrop-blur-sm p-4 shadow-sm">
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
                  {g}
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
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(gradeFilter || sectionFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setGradeFilter("");
              setSectionFilter("");
            }}
          >
            Clear filters
          </Button>
        )}
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
              label="Students with Dues"
              value={String(studentsWithDues)}
              variant="neutral"
            />
          </StaggerItem>
          <StaggerItem>
            <SummaryCard
              label="Total Pending Amount"
              value={formatINR(totalPending)}
              variant={totalPending > 0 ? "negative" : "positive"}
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
            Student Dues
          </span>
          <ExportButton
            data={data ?? []}
            columns={[
              { key: "admission_no", label: "Adm. No" },
              { key: "name", label: "Student Name" },
              { key: "grade", label: "Grade" },
              { key: "section", label: "Section" },
              { key: "total_fee", label: "Total Fee" },
              { key: "total_paid", label: "Paid" },
              { key: "total_discount", label: "Discount" },
              { key: "pending", label: "Pending" },
            ]}
            filename="student-dues"
            disabled={isLoading || !data?.length}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Adm. No</TableHead>
              <TableHead>Student Name</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Section</TableHead>
              <TableHead className="text-right">Total Fee</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Discount</TableHead>
              <TableHead className="text-right">Pending</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows cols={8} />
            ) : data?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-text-secondary text-sm"
                >
                  No students found.
                </TableCell>
              </TableRow>
            ) : (
              data?.map((row, i) => (
                <motion.tr
                  key={row.student_id}
                  custom={i}
                  variants={tableRowVariants}
                  initial="hidden"
                  animate="visible"
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  <TableCell className="font-mono text-xs text-text-secondary">
                    {row.admission_no}
                  </TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.grade}</TableCell>
                  <TableCell>{row.section}</TableCell>
                  <TableCell className="text-right">
                    {row.total_fee > 0 ? formatINR(row.total_fee) : "—"}
                  </TableCell>
                  <TableCell className="text-right text-success">
                    {row.total_paid > 0 ? formatINR(row.total_paid) : "—"}
                  </TableCell>
                  <TableCell className="text-right text-text-secondary">
                    {row.total_discount > 0
                      ? formatINR(row.total_discount)
                      : "—"}
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold ${row.pending > 0 ? "text-danger" : "text-success"}`}
                  >
                    {row.pending > 0 ? formatINR(row.pending) : "Paid"}
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
