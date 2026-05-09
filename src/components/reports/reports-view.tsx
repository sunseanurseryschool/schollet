"use client";

import { formatINR } from "@/lib/format";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  PageTransition,
  AnimatedCard,
  AnimatedCounter,
  StaggerContainer,
  StaggerItem,
  tableRowVariants,
} from "@/components/ui/animated";
import type {
  IncomeExpenseResult,
  ProfitLossResult,
  StudentDuesRow,
  CollectionRow,
  DiscountRow,
  ExpenseReportRow,
  ExpenseReportResult,
  SalaryReportRow,
  SalaryReportResult,
  InventoryReportRow,
} from "@/services/reports";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return {
    from: `${y}-${m}-01`,
    to: `${y}-${m}-${String(lastDay).padStart(2, "0")}`,
  };
}

// ─── Premium Tab Bar ──────────────────────────────────────────────────────────

interface PremiumTabsProps {
  tabs: ReadonlyArray<{ readonly value: string; readonly label: string }>;
  activeTab: string;
  onTabChange: (value: string) => void;
}

function PremiumTabs({ tabs, activeTab, onTabChange }: PremiumTabsProps) {
  return (
    <div className="relative flex gap-0.5 rounded-xl bg-surface-tertiary p-1 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onTabChange(tab.value)}
            className="relative z-10 flex-shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
            style={{ color: isActive ? "var(--text-primary)" : "var(--text-secondary)" }}
          >
            {isActive && (
              <motion.span
                layoutId="reports-tab-pill"
                className="absolute inset-0 rounded-lg bg-surface shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
              />
            )}
            <span className="relative z-10 whitespace-nowrap">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: string;
  variant?: "default" | "positive" | "negative" | "neutral";
  delay?: number;
}

function SummaryCard({ label, value, variant = "default", delay = 0 }: SummaryCardProps) {
  const valueClass =
    variant === "positive"
      ? "text-success"
      : variant === "negative"
        ? "text-danger"
        : variant === "neutral"
          ? "text-brand"
          : "text-text-primary";

  const borderClass =
    variant === "positive"
      ? "border-l-success"
      : variant === "negative"
        ? "border-l-danger"
        : variant === "neutral"
          ? "border-l-brand"
          : "border-l-text-tertiary";

  return (
    <AnimatedCard
      delay={delay}
      className={`rounded-xl border border-l-4 bg-surface p-4 flex flex-col gap-1 ${borderClass}`}
    >
      <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">
        {label}
      </span>
      <AnimatedCounter
        value={value}
        className={`text-xl font-bold ${valueClass}`}
      />
    </AnimatedCard>
  );
}

// ─── Date range filter bar (frosted) ─────────────────────────────────────────

interface DateRangeFilterProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  children?: React.ReactNode;
}

function DateRangeFilter({
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

// ─── Skeleton rows ────────────────────────────────────────────────────────────

function TableSkeletonRows({ cols, rows = 4 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ─── Tab content fade/slide animation ────────────────────────────────────────

const tabContentVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.2 } },
};

// ─── Tab 1: Income vs Expense ─────────────────────────────────────────────────

function IncomeExpenseTab() {
  const defaultRange = currentMonthRange();
  const [dateFrom, setDateFrom] = React.useState(defaultRange.from);
  const [dateTo, setDateTo] = React.useState(defaultRange.to);
  const [data, setData] = React.useState<IncomeExpenseResult | null>(null);
  const [plData, setPlData] = React.useState<ProfitLossResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
      const [ieRes, plRes] = await Promise.all([
        fetch(`/api/reports/income-expense?${params.toString()}`),
        fetch(`/api/reports/profit-loss?${params.toString()}`),
      ]);
      if (!ieRes.ok) {
        const b = (await ieRes.json()) as { error?: string };
        throw new Error(b.error ?? "Failed to load income/expense data");
      }
      if (!plRes.ok) {
        const b = (await plRes.json()) as { error?: string };
        throw new Error(b.error ?? "Failed to load P&L data");
      }
      const [ieData, plDataResult] = await Promise.all([
        ieRes.json() as Promise<IncomeExpenseResult>,
        plRes.json() as Promise<ProfitLossResult>,
      ]);
      setData(ieData);
      setPlData(plDataResult);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <div className="flex flex-col gap-4">
      <DateRangeFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />

      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : data ? (
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StaggerItem>
            <SummaryCard label="Total Income" value={formatINR(data.total_income)} variant="positive" />
          </StaggerItem>
          <StaggerItem>
            <SummaryCard label="Total Expense" value={formatINR(data.total_expense)} variant="negative" />
          </StaggerItem>
          <StaggerItem>
            <SummaryCard label="Net" value={formatINR(data.net)} variant={data.net >= 0 ? "positive" : "negative"} />
          </StaggerItem>
        </StaggerContainer>
      ) : null}

      {plData && (
        <AnimatedCard className="rounded-xl ring-1 ring-foreground/10 bg-surface overflow-hidden" hover={false}>
          <div className="px-5 py-3 border-b flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Account Breakdown</h3>
            <ExportButton
              data={[
                ...plData.income_lines.map((l) => ({ account_name: l.account_name, type: "Income", amount: l.amount })),
                ...plData.expense_lines.map((l) => ({ account_name: l.account_name, type: "Expense", amount: l.amount })),
              ]}
              columns={[
                { key: "account_name", label: "Account" },
                { key: "type", label: "Type" },
                { key: "amount", label: "Amount" },
              ]}
              filename={`income-expense-${dateFrom}-to-${dateTo}`}
              disabled={isLoading || (plData.income_lines.length === 0 && plData.expense_lines.length === 0)}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeletonRows cols={3} />
              ) : plData.income_lines.length === 0 && plData.expense_lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-text-secondary text-sm">
                    No journal entries found for this period.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {plData.income_lines.map((line, i) => (
                    <motion.tr
                      key={line.account_id}
                      custom={i}
                      variants={tableRowVariants}
                      initial="hidden"
                      animate="visible"
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <TableCell className="font-medium">{line.account_name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Income</span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-success">{formatINR(line.amount)}</TableCell>
                    </motion.tr>
                  ))}
                  {plData.expense_lines.map((line, i) => (
                    <motion.tr
                      key={line.account_id}
                      custom={plData.income_lines.length + i}
                      variants={tableRowVariants}
                      initial="hidden"
                      animate="visible"
                      className="border-b transition-colors hover:bg-muted/50"
                    >
                      <TableCell className="font-medium">{line.account_name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Expense</span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-danger">{formatINR(line.amount)}</TableCell>
                    </motion.tr>
                  ))}
                  <TableRow className="bg-surface-secondary font-semibold">
                    <TableCell colSpan={2} className="text-text-primary">Net Profit / Loss</TableCell>
                    <TableCell className={`text-right font-bold ${plData.net_profit >= 0 ? "text-success" : "text-danger"}`}>
                      {formatINR(plData.net_profit)}
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </AnimatedCard>
      )}
    </div>
  );
}

// ─── Tab 2: Student Dues ──────────────────────────────────────────────────────

function StudentDuesTab() {
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

  const totalPending = data?.reduce((s, r) => s + Math.max(r.pending, 0), 0) ?? 0;
  const studentsWithDues = data?.filter((r) => r.pending > 0).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border-light bg-surface/80 backdrop-blur-sm p-4 shadow-sm">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-text-secondary">Grade</Label>
          <Select value={gradeFilter} onValueChange={(val) => setGradeFilter(val == null || val === "__all__" ? "" : val)}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="All Grades" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Grades</SelectItem>
              {GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-text-secondary">Section</Label>
          <Select value={sectionFilter} onValueChange={(val) => setSectionFilter(val == null || val === "__all__" ? "" : val)}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="All Sections" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Sections</SelectItem>
              {SECTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {(gradeFilter || sectionFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setGradeFilter(""); setSectionFilter(""); }}>
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
            <SummaryCard label="Students with Dues" value={String(studentsWithDues)} variant="neutral" />
          </StaggerItem>
          <StaggerItem>
            <SummaryCard label="Total Pending Amount" value={formatINR(totalPending)} variant={totalPending > 0 ? "negative" : "positive"} />
          </StaggerItem>
        </StaggerContainer>
      ) : null}

      <AnimatedCard className="rounded-xl ring-1 ring-foreground/10 bg-surface overflow-hidden" hover={false}>
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <span className="text-sm font-semibold text-text-primary">Student Dues</span>
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
                <TableCell colSpan={8} className="h-24 text-center text-text-secondary text-sm">No students found.</TableCell>
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
                  <TableCell className="font-mono text-xs text-text-secondary">{row.admission_no}</TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.grade}</TableCell>
                  <TableCell>{row.section}</TableCell>
                  <TableCell className="text-right">{row.total_fee > 0 ? formatINR(row.total_fee) : "—"}</TableCell>
                  <TableCell className="text-right text-success">{row.total_paid > 0 ? formatINR(row.total_paid) : "—"}</TableCell>
                  <TableCell className="text-right text-text-secondary">{row.total_discount > 0 ? formatINR(row.total_discount) : "—"}</TableCell>
                  <TableCell className={`text-right font-semibold ${row.pending > 0 ? "text-danger" : "text-success"}`}>
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

// ─── Tab 3: Collection Report ─────────────────────────────────────────────────

function CollectionTab() {
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
      const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
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
          <Select value={gradeFilter} onValueChange={(val) => setGradeFilter(val == null || val === "__all__" ? "" : val)}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="All Grades" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Grades</SelectItem>
              {GRADES.map((g) => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-text-secondary">Section</Label>
          <Select value={sectionFilter} onValueChange={(val) => setSectionFilter(val == null || val === "__all__" ? "" : val)}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="All Sections" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Sections</SelectItem>
              {SECTIONS.map((s) => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}
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
            <SummaryCard label="Total Collected" value={formatINR(totalCollected)} variant="positive" />
          </StaggerItem>
          <StaggerItem>
            <SummaryCard label="Students Paid" value={String(totalStudents)} variant="neutral" />
          </StaggerItem>
        </StaggerContainer>
      ) : null}

      <AnimatedCard className="rounded-xl ring-1 ring-foreground/10 bg-surface overflow-hidden" hover={false}>
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <span className="text-sm font-semibold text-text-primary">Collection Report</span>
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
                <TableCell colSpan={4} className="h-24 text-center text-text-secondary text-sm">No collections found for this period.</TableCell>
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
                  <TableCell className="font-medium">Grade {row.grade}</TableCell>
                  <TableCell>Section {row.section}</TableCell>
                  <TableCell className="text-right">{row.student_count}</TableCell>
                  <TableCell className="text-right font-semibold text-success">{formatINR(row.total_collected)}</TableCell>
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
      </AnimatedCard>
    </div>
  );
}

// ─── Tab 4: Discount Report ───────────────────────────────────────────────────

function DiscountTab() {
  const defaultRange = currentMonthRange();
  const [dateFrom, setDateFrom] = React.useState(defaultRange.from);
  const [dateTo, setDateTo] = React.useState(defaultRange.to);
  const [data, setData] = React.useState<DiscountRow[] | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
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
            <SummaryCard label="Total Discounts Given" value={formatINR(totalDiscount)} variant="negative" />
          </StaggerItem>
          <StaggerItem>
            <SummaryCard label="Transactions with Discount" value={String(data.length)} variant="neutral" />
          </StaggerItem>
        </StaggerContainer>
      ) : null}

      <AnimatedCard className="rounded-xl ring-1 ring-foreground/10 bg-surface overflow-hidden" hover={false}>
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <span className="text-sm font-semibold text-text-primary">Discount Report</span>
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
                <TableCell colSpan={6} className="h-24 text-center text-text-secondary text-sm">No discounts found for this period.</TableCell>
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
                    <div className="font-medium text-text-primary">{row.student_name}</div>
                    <div className="text-xs text-text-secondary">{row.admission_no}</div>
                  </TableCell>
                  <TableCell className="text-text-secondary text-sm">{row.grade} / {row.section}</TableCell>
                  <TableCell className="font-mono text-xs text-text-secondary">{row.receipt_no}</TableCell>
                  <TableCell className="text-sm text-text-secondary">{formatDate(row.payment_date)}</TableCell>
                  <TableCell className="text-right font-semibold text-danger">{formatINR(row.discount_amount)}</TableCell>
                  <TableCell className="text-sm text-text-secondary max-w-[200px] truncate">{row.discount_reason ?? "—"}</TableCell>
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
      </AnimatedCard>
    </div>
  );
}

// ─── Tab 5: Expense Report ────────────────────────────────────────────────────

function ExpenseReportTab() {
  const defaultRange = currentMonthRange();
  const [dateFrom, setDateFrom] = React.useState(defaultRange.from);
  const [dateTo, setDateTo] = React.useState(defaultRange.to);
  const [categoryFilter, setCategoryFilter] = React.useState<string>("");
  const [data, setData] = React.useState<ExpenseReportResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
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

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

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
          <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val == null || val === "__all__" ? "" : val)}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Categories</SelectItem>
              {EXPENSE_CATEGORY_VALUES.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
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
            <SummaryCard label="Total Expenses" value={formatINR(data.total)} variant="negative" />
          </StaggerItem>
          <StaggerItem>
            <SummaryCard label="Expense Entries" value={String(data.rows.length)} variant="neutral" />
          </StaggerItem>
        </StaggerContainer>
      ) : null}

      <AnimatedCard className="rounded-xl ring-1 ring-foreground/10 bg-surface overflow-hidden" hover={false}>
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <span className="text-sm font-semibold text-text-primary">Expense Report</span>
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
                <TableCell colSpan={5} className="h-24 text-center text-text-secondary text-sm">No expenses found for this period.</TableCell>
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
                    <TableCell className="text-sm text-text-secondary">{formatDate(row.date)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">{row.category}</span>
                    </TableCell>
                    <TableCell className="font-medium text-text-primary max-w-[220px] truncate">{row.description}</TableCell>
                    <TableCell className="text-sm text-text-secondary">{row.paid_by_name}</TableCell>
                    <TableCell className="text-right font-semibold text-danger">{formatINR(row.amount)}</TableCell>
                  </motion.tr>
                ))}
                {data && data.rows.length > 0 && (
                  <TableRow className="bg-surface-secondary font-semibold">
                    <TableCell colSpan={4} className="text-text-primary">Total</TableCell>
                    <TableCell className="text-right font-bold text-danger">{formatINR(data.total)}</TableCell>
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

// ─── Tab 6: Salary Report ─────────────────────────────────────────────────────

function currentYearMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function SalaryReportTab() {
  const [monthFilter, setMonthFilter] = React.useState<string>(currentYearMonth());
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
          <Label htmlFor="salary-month" className="text-xs text-text-secondary">Month</Label>
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
            <SummaryCard label="Total Salary Paid" value={formatINR(data.total)} variant="negative" />
          </StaggerItem>
          <StaggerItem>
            <SummaryCard label="Payments Recorded" value={String(data.rows.length)} variant="neutral" />
          </StaggerItem>
        </StaggerContainer>
      ) : null}

      <AnimatedCard className="rounded-xl ring-1 ring-foreground/10 bg-surface overflow-hidden" hover={false}>
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <span className="text-sm font-semibold text-text-primary">Salary Report</span>
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
                <TableCell colSpan={5} className="h-24 text-center text-text-secondary text-sm">No salary payments found.</TableCell>
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
                    <TableCell className="font-medium">{row.staff_name}</TableCell>
                    <TableCell className="text-sm text-text-secondary">{row.month}</TableCell>
                    <TableCell className="text-sm text-text-secondary">{formatDate(row.payment_date)}</TableCell>
                    <TableCell className="text-sm text-text-secondary max-w-[180px] truncate">{row.notes ?? "—"}</TableCell>
                    <TableCell className="text-right font-semibold text-danger">{formatINR(row.amount)}</TableCell>
                  </motion.tr>
                ))}
                {data && data.rows.length > 0 && (
                  <TableRow className="bg-surface-secondary font-semibold">
                    <TableCell colSpan={4} className="text-text-primary">Total</TableCell>
                    <TableCell className="text-right font-bold text-danger">{formatINR(data.total)}</TableCell>
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

// ─── Tab 7: Inventory Report ──────────────────────────────────────────────────

function InventoryReportTab() {
  const [data, setData] = React.useState<InventoryReportRow[] | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/reports/inventory");
      if (!res.ok) {
        const b = (await res.json()) as { error?: string };
        throw new Error(b.error ?? "Failed to load inventory report");
      }
      setData((await res.json()) as InventoryReportRow[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const lowStockCount = data?.filter((r) => r.is_low_stock).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : data ? (
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StaggerItem>
            <SummaryCard label="Total Items" value={String(data.length)} variant="neutral" />
          </StaggerItem>
          <StaggerItem>
            <SummaryCard label="Low Stock Items" value={String(lowStockCount)} variant={lowStockCount > 0 ? "negative" : "positive"} />
          </StaggerItem>
        </StaggerContainer>
      ) : null}

      <AnimatedCard className="rounded-xl ring-1 ring-foreground/10 bg-surface overflow-hidden" hover={false}>
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <span className="text-sm font-semibold text-text-primary">Inventory Report</span>
          <ExportButton
            data={(data ?? []).map((row) => ({ ...row, status: row.is_low_stock ? "Low Stock" : "OK" }))}
            columns={[
              { key: "name", label: "Item Name" },
              { key: "unit", label: "Unit" },
              { key: "quantity", label: "In Stock" },
              { key: "min_quantity", label: "Min. Stock" },
              { key: "total_in", label: "Total IN" },
              { key: "total_out", label: "Total OUT" },
              { key: "status", label: "Status" },
            ]}
            filename="inventory-report"
            disabled={isLoading || !data?.length}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">In Stock</TableHead>
              <TableHead className="text-right">Min. Stock</TableHead>
              <TableHead className="text-right">Total IN</TableHead>
              <TableHead className="text-right">Total OUT</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows cols={7} />
            ) : data?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-text-secondary text-sm">No inventory items found.</TableCell>
              </TableRow>
            ) : (
              data?.map((row: InventoryReportRow, i: number) => (
                <motion.tr
                  key={row.id}
                  custom={i}
                  variants={tableRowVariants}
                  initial="hidden"
                  animate="visible"
                  className={`border-b transition-colors hover:bg-muted/50 ${row.is_low_stock ? "bg-red-50/40" : ""}`}
                >
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-sm text-text-secondary">{row.unit}</TableCell>
                  <TableCell className={`text-right font-semibold ${row.is_low_stock ? "text-danger" : "text-text-primary"}`}>{row.quantity}</TableCell>
                  <TableCell className="text-right text-text-secondary">{row.min_quantity}</TableCell>
                  <TableCell className="text-right text-success">{row.total_in}</TableCell>
                  <TableCell className="text-right text-text-secondary">{row.total_out}</TableCell>
                  <TableCell>
                    {row.is_low_stock ? (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Low Stock</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">OK</span>
                    )}
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

// ─── Main Reports View ────────────────────────────────────────────────────────

const REPORT_TABS = [
  { value: "income-expense", label: "Income vs Expense" },
  { value: "student-dues", label: "Student Dues" },
  { value: "collection", label: "Collection" },
  { value: "discounts", label: "Discounts" },
  { value: "expenses", label: "Expenses" },
  { value: "salary", label: "Salary" },
  { value: "inventory", label: "Inventory" },
] as const;

type ReportTab = (typeof REPORT_TABS)[number]["value"];

export function ReportsView() {
  const [activeTab, setActiveTab] = React.useState<ReportTab>("income-expense");

  return (
    <PageTransition>
      <div className="flex flex-col gap-5">
        <PremiumTabs
          tabs={REPORT_TABS}
          activeTab={activeTab}
          onTabChange={(v) => setActiveTab(v as ReportTab)}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={tabContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {activeTab === "income-expense" && <IncomeExpenseTab />}
            {activeTab === "student-dues" && <StudentDuesTab />}
            {activeTab === "collection" && <CollectionTab />}
            {activeTab === "discounts" && <DiscountTab />}
            {activeTab === "expenses" && <ExpenseReportTab />}
            {activeTab === "salary" && <SalaryReportTab />}
            {activeTab === "inventory" && <InventoryReportTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
