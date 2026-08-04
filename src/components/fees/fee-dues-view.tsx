"use client";

import { formatINR } from "@/lib/format";
import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { AlertCircle, TrendingDownIcon, UsersIcon } from "lucide-react";
import { ExportButton } from "@/components/export-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PageTransition,
  AnimatedCard,
  AnimatedCounter,
  StaggerContainer,
  StaggerItem,
  tableRowVariants,
} from "@/components/ui/animated";
import { GRADES, SECTIONS } from "@/lib/constants";
import type { DetailedDuesRow, DuesSummary } from "@/services/reports";
import { todayParts } from "@/lib/dates";

// ─── Constants ────────────────────────────────────────────────────────────────

const HIGH_DUES_THRESHOLD = 5000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getCurrentAcademicYear(): string {
  const { year, month } = todayParts();
  const startYear = month >= 6 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

function buildAcademicYearOptions(): string[] {
  const current = getCurrentAcademicYear();
  const [startStr] = current.split("-");
  const start = parseInt(startStr, 10);
  return [
    `${start - 2}-${start - 1}`,
    `${start - 1}-${start}`,
    `${start}-${start + 1}`,
  ].reverse();
}

// ─── Summary metric card ─────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  variant: "amber" | "red";
  delay?: number;
}

function MetricCard({
  label,
  value,
  icon,
  variant,
  delay = 0,
}: MetricCardProps) {
  const styles = {
    amber: {
      wrapper:
        "bg-gradient-to-br from-amber-50 to-yellow-100/60 border-amber-200",
      icon: "bg-amber-100 text-amber-600",
      label: "text-amber-600",
      value: "text-amber-700",
    },
    red: {
      wrapper: "bg-gradient-to-br from-red-50 to-rose-100/60 border-red-200",
      icon: "bg-red-100 text-red-600",
      label: "text-red-600",
      value: "text-red-700",
    },
  } as const;

  const s = styles[variant];

  return (
    <AnimatedCard
      delay={delay}
      hover={false}
      className={`rounded-xl border p-4 flex flex-col gap-3 ${s.wrapper}`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-semibold uppercase tracking-wide ${s.label}`}
        >
          {label}
        </span>
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-lg ${s.icon}`}
        >
          {icon}
        </div>
      </div>
      <AnimatedCounter
        value={value}
        className={`text-2xl font-bold ${s.value}`}
      />
    </AnimatedCard>
  );
}

// ─── Grade breakdown card ────────────────────────────────────────────────────

function GradeBreakdownCard({
  breakdown,
  delay = 0,
}: {
  breakdown: DuesSummary["grade_breakdown"];
  delay?: number;
}) {
  return (
    <AnimatedCard
      delay={delay}
      hover={false}
      className="rounded-xl border bg-surface p-4 flex flex-col gap-3"
    >
      <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
        Grade-wise Breakdown
      </span>
      {breakdown.length === 0 ? (
        <span className="text-sm text-text-secondary">No dues</span>
      ) : (
        <StaggerContainer className="flex flex-wrap gap-2">
          {breakdown.map((gb) => (
            <StaggerItem key={gb.grade}>
              <span className="inline-flex items-center gap-1 rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-xs font-medium text-red-700">
                {gb.grade}: {gb.student_count}
                {" · "}
                {formatINR(gb.pending_amount)}
              </span>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </AnimatedCard>
  );
}

// ─── High-dues pulse cell ─────────────────────────────────────────────────────

function PendingAmountCell({ amount }: { amount: number }) {
  const isHigh = amount >= HIGH_DUES_THRESHOLD;

  if (!isHigh) {
    return (
      <span className="font-semibold text-red-600">
        {formatINR(amount)}
      </span>
    );
  }

  return (
    <motion.span
      animate={{
        opacity: [1, 0.65, 1],
      }}
      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      className="inline-flex items-center gap-1 font-bold text-red-700"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
      {formatINR(amount)}
    </motion.span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FeeDuesView() {
  const academicYearOptions = buildAcademicYearOptions();
  const defaultYear = getCurrentAcademicYear();

  const [gradeFilter, setGradeFilter] = React.useState<string>("all");
  const [sectionFilter, setSectionFilter] = React.useState<string>("all");
  const [yearFilter, setYearFilter] = React.useState<string>(defaultYear);

  const [rows, setRows] = React.useState<DetailedDuesRow[]>([]);
  const [summary, setSummary] = React.useState<DuesSummary | null>(null);
  const [isLoadingRows, setIsLoadingRows] = React.useState(true);
  const [isLoadingSummary, setIsLoadingSummary] = React.useState(true);

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchRows = React.useCallback(async () => {
    setIsLoadingRows(true);
    try {
      const params = new URLSearchParams();
      if (gradeFilter !== "all") params.set("grade", gradeFilter);
      if (sectionFilter !== "all") params.set("section", sectionFilter);
      if (yearFilter !== "all") params.set("academic_year", yearFilter);

      const res = await fetch(`/api/fees/dues?${params.toString()}`);
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to load dues");
      }
      const data = (await res.json()) as DetailedDuesRow[];
      setRows(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load dues";
      toast.error(message);
    } finally {
      setIsLoadingRows(false);
    }
  }, [gradeFilter, sectionFilter, yearFilter]);

  const fetchSummary = React.useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      const params = new URLSearchParams();
      if (yearFilter !== "all") params.set("academic_year", yearFilter);

      const res = await fetch(`/api/fees/dues/summary?${params.toString()}`);
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to load summary");
      }
      const data = (await res.json()) as DuesSummary;
      setSummary(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load summary";
      toast.error(message);
    } finally {
      setIsLoadingSummary(false);
    }
  }, [yearFilter]);

  React.useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  React.useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <PageTransition>
      <div className="flex flex-col gap-6">
        {/* ── Summary cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {isLoadingSummary ? (
            <>
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </>
          ) : summary ? (
            <>
              <MetricCard
                label="Students with Dues"
                value={String(summary.total_students_with_dues)}
                icon={<UsersIcon className="h-4 w-4" />}
                variant="amber"
                delay={0}
              />
              <MetricCard
                label="Total Pending Amount"
                value={formatINR(summary.total_pending_amount)}
                icon={<TrendingDownIcon className="h-4 w-4" />}
                variant="red"
                delay={0.07}
              />
              <GradeBreakdownCard
                breakdown={summary.grade_breakdown}
                delay={0.14}
              />
            </>
          ) : null}
        </div>

        {/* ── Filters — frosted card style ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.35,
            delay: 0.1,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="rounded-xl border bg-surface/80 backdrop-blur-sm p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-end gap-4">
            {/* Academic Year */}
            <div className="grid gap-1.5 min-w-[160px]">
              <Label
                htmlFor="year-filter"
                className="text-xs font-semibold text-text-secondary uppercase tracking-wide"
              >
                Academic Year
              </Label>
              <Select
                value={yearFilter}
                onValueChange={(val) => {
                  if (val != null) setYearFilter(val);
                }}
              >
                <SelectTrigger id="year-filter" className="w-full bg-surface">
                  <span>{yearFilter === "all" ? "All Years" : yearFilter}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {academicYearOptions.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grade */}
            <div className="grid gap-1.5 min-w-[130px]">
              <Label
                htmlFor="grade-filter"
                className="text-xs font-semibold text-text-secondary uppercase tracking-wide"
              >
                Grade
              </Label>
              <Select
                value={gradeFilter}
                onValueChange={(val) => {
                  if (val != null) setGradeFilter(val);
                }}
              >
                <SelectTrigger id="grade-filter" className="w-full bg-surface">
                  <span>{gradeFilter === "all" ? "All Grades" : gradeFilter}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {GRADES.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Section */}
            <div className="grid gap-1.5 min-w-[130px]">
              <Label
                htmlFor="section-filter"
                className="text-xs font-semibold text-text-secondary uppercase tracking-wide"
              >
                Section
              </Label>
              <Select
                value={sectionFilter}
                onValueChange={(val) => {
                  if (val != null) setSectionFilter(val);
                }}
              >
                <SelectTrigger
                  id="section-filter"
                  className="w-full bg-surface"
                >
                  <span>{sectionFilter === "all" ? "All Sections" : `${sectionFilter}`}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {SECTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {/* ── Dues table ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            delay: 0.18,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="rounded-xl border bg-surface overflow-hidden shadow-sm"
        >
          <div className="px-5 py-4 border-b flex items-center justify-between bg-surface">
            <h2 className="text-base font-semibold text-text-primary">
              Students with Pending Dues
            </h2>
            <div className="flex items-center gap-3">
              {!isLoadingRows && (
                <motion.span
                  key={rows.length}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-sm text-text-secondary bg-surface-tertiary px-2 py-0.5 rounded-full"
                >
                  {rows.length} student{rows.length !== 1 ? "s" : ""}
                </motion.span>
              )}
              <ExportButton
                data={rows}
                columns={[
                  { key: "admission_no", label: "Admission No" },
                  { key: "name", label: "Student Name" },
                  { key: "grade", label: "Grade" },
                  { key: "section", label: "Section" },
                  { key: "total_fee", label: "Total Fee" },
                  { key: "total_paid", label: "Paid" },
                  { key: "pending", label: "Pending" },
                  { key: "last_payment_date", label: "Last Payment Date" },
                ]}
                filename="fee-dues"
                disabled={isLoadingRows || rows.length === 0}
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Adm. No</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Section</TableHead>
                <TableHead className="text-right">Total Fee</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead>Last Payment</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingRows ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="h-32 text-center text-text-secondary text-sm"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="h-8 w-8 text-text-tertiary" />
                      <span>
                        No pending dues found for the selected filters.
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, i) => (
                  <motion.tr
                    key={row.student_id}
                    variants={tableRowVariants}
                    initial="hidden"
                    animate="visible"
                    custom={i}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">
                      {row.name}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-text-secondary">
                      {row.admission_no}
                    </TableCell>
                    <TableCell className="text-text-secondary text-sm">
                      {row.grade}
                    </TableCell>
                    <TableCell className="text-text-secondary text-sm">
                      {row.section}
                    </TableCell>
                    <TableCell className="text-right text-text-secondary">
                      {formatINR(row.total_fee)}
                    </TableCell>
                    <TableCell className="text-right text-text-secondary">
                      {formatINR(row.total_paid)}
                    </TableCell>
                    <TableCell className="text-right">
                      <PendingAmountCell amount={row.pending} />
                    </TableCell>
                    <TableCell className="text-sm text-text-secondary">
                      {formatDate(row.last_payment_date)}
                    </TableCell>
                    <TableCell className="text-right">
                      <motion.div
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <Button
                          size="sm"
                          nativeButton={false}
                          className="h-7 text-xs bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] text-white border-0 shadow-sm transition-all"
                          render={
                            <Link
                              href={`/dashboard/fees/collect?student_id=${row.student_id}`}
                            />
                          }
                        >
                          Collect
                        </Button>
                      </motion.div>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </motion.div>
      </div>
    </PageTransition>
  );
}
