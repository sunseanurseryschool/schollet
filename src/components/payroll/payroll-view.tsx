"use client";

import { formatINR } from "@/lib/format";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Wallet,
  CheckCircle2Icon,
  PlayIcon,
  PlayCircleIcon,
  UsersIcon,
  BanknoteIcon,
  ClockIcon,
  Trash2Icon,
  Loader2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PageTransition,
  AnimatedCounter,
  AnimatedCard,
  tableRowVariants,
} from "@/components/ui/animated";
import { useAccounts } from "@/hooks/use-accounts";

// ─── Local types ──────────────────────────────────────────────────────────────

interface SalaryPayment {
  id: string;
  staff_id: string;
  amount: number;
  month: string;
  payment_date: string;
  notes: string;
  created_at: string;
}

interface StaffPayrollRow {
  id: string;
  name: string;
  email: string;
  salary: number;
  is_active: boolean;
  role?: { id: string; name: string } | null;
  payment: SalaryPayment | null;
}

interface SalaryPaymentWithStaff extends SalaryPayment {
  staff: {
    id: string;
    name: string;
    email: string;
    salary: number;
    role?: { id: string; name: string } | null;
  } | null;
}

interface SalaryPaymentListResult {
  payments: SalaryPaymentWithStaff[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface BulkSalaryResult {
  processed: number;
  skipped: number;
  errors: Array<{ staff_id: string; name: string; error: string }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMonth(month: string): string {
  const [year, mon] = month.split("-");
  const date = new Date(Number(year), Number(mon) - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function buildMonthOptions(): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
    options.push({ value, label });
  }
  return options;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ─── Summary Stat Card ────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  delay: number;
  accent: string;
  iconBg: string;
}

function StatCard({
  label,
  value,
  icon,
  delay,
  accent,
  iconBg,
}: StatCardProps) {
  return (
    <AnimatedCard
      delay={delay}
      className="rounded-2xl ring-1 ring-foreground/10 bg-surface p-4 overflow-hidden"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-text-secondary font-medium uppercase tracking-wide truncate">
            {label}
          </p>
          <AnimatedCounter
            value={value}
            className={`mt-1 text-xl font-bold ${accent}`}
          />
        </div>
        <div className={`shrink-0 rounded-xl p-2 ${iconBg}`}>{icon}</div>
      </div>
    </AnimatedCard>
  );
}

// ─── Payroll Staff Card ───────────────────────────────────────────────────────

interface PayrollCardProps {
  row: StaffPayrollRow;
  index: number;
  onProcess: (row: StaffPayrollRow) => void;
}

function PayrollStaffCard({ row, index, onProcess }: PayrollCardProps) {
  const isPaid = row.payment !== null;
  const noSalary = row.salary === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{
        y: -2,
        boxShadow: "0 10px 30px -8px rgba(0,0,0,0.08)",
        transition: { duration: 0.18 },
      }}
      className={`rounded-2xl border bg-surface p-4 flex flex-col gap-3 ${
        isPaid ? "border-emerald-200 bg-emerald-50/20" : "border-border-light"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-text-primary truncate">{row.name}</p>
          <p className="text-xs text-text-secondary truncate">{row.email}</p>
        </div>
        <StatusBadge variant={isPaid ? "paid" : "unpaid"} />
      </div>

      {/* Role + salary */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary">
          {row.role?.name ?? <span className="italic">No role</span>}
        </span>
        <span
          className={`font-semibold tabular-nums ${noSalary ? "text-text-secondary" : "text-text-primary"}`}
        >
          {noSalary ? "Not set" : formatINR(row.salary)}
        </span>
      </div>

      {/* Payment date or action */}
      <div className="pt-1 border-t border-border-lighter">
        {isPaid ? (
          <p className="text-xs text-text-secondary">
            Paid on{" "}
            <span className="font-medium text-emerald-700">
              {formatDate(row.payment!.payment_date)}
            </span>
          </p>
        ) : noSalary ? (
          <p className="text-xs text-text-secondary italic">
            No salary configured
          </p>
        ) : (
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs border-brand/30 text-brand hover:bg-blue-50"
              onClick={() => onProcess(row)}
            >
              <PlayIcon className="h-3 w-3" />
              Process Salary
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PayrollView() {
  const monthOptions = React.useMemo(() => buildMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] =
    React.useState<string>(currentMonth());

  const [payrollRows, setPayrollRows] = React.useState<StaffPayrollRow[]>([]);
  const [isGridLoading, setIsGridLoading] = React.useState(true);

  const [historyResult, setHistoryResult] =
    React.useState<SalaryPaymentListResult | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = React.useState(true);
  const [historyPage, setHistoryPage] = React.useState(1);

  const [processTarget, setProcessTarget] =
    React.useState<StaffPayrollRow | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const [deleteTarget, setDeleteTarget] =
    React.useState<SalaryPaymentWithStaff | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const [bulkDialogOpen, setBulkDialogOpen] = React.useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = React.useState(false);

  const { accounts } = useAccounts();
  const [processAccountId, setProcessAccountId] = React.useState<string>("");
  const [bulkAccountId, setBulkAccountId] = React.useState<string>("");

  React.useEffect(() => {
    if (processTarget) setProcessAccountId("");
  }, [processTarget]);
  React.useEffect(() => {
    if (bulkDialogOpen) setBulkAccountId("");
  }, [bulkDialogOpen]);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchPayrollGrid = React.useCallback(async () => {
    setIsGridLoading(true);
    try {
      const res = await fetch(
        `/api/salary/grid?month=${encodeURIComponent(selectedMonth)}`,
      );
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to load payroll data");
      }
      const data = (await res.json()) as StaffPayrollRow[];
      setPayrollRows(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load payroll data";
      toast.error(message);
    } finally {
      setIsGridLoading(false);
    }
  }, [selectedMonth]);

  const fetchPaymentHistory = React.useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(historyPage));
      params.set("per_page", "20");

      const res = await fetch(`/api/salary?${params.toString()}`);
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to load payment history");
      }
      const data = (await res.json()) as SalaryPaymentListResult;
      setHistoryResult(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load payment history";
      toast.error(message);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [historyPage]);

  React.useEffect(() => {
    void fetchPayrollGrid();
  }, [fetchPayrollGrid]);

  React.useEffect(() => {
    void fetchPaymentHistory();
  }, [fetchPaymentHistory]);

  React.useEffect(() => {
    setHistoryPage(1);
  }, [selectedMonth]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function handleProcessConfirm() {
    if (!processTarget) return;
    if (!processAccountId) {
      toast.error("Select an account");
      return;
    }
    setIsProcessing(true);
    try {
      const res = await fetch("/api/salary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staff_id: processTarget.id,
          account_id: processAccountId,
          month: selectedMonth,
          amount: processTarget.salary,
        }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to process salary");
      }

      toast.success(
        `Salary processed for ${processTarget.name} — ${formatMonth(selectedMonth)}`,
      );
      setProcessTarget(null);
      void fetchPayrollGrid();
      void fetchPaymentHistory();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to process salary";
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleBulkProcessConfirm() {
    if (!bulkAccountId) {
      toast.error("Select an account");
      return;
    }
    setIsBulkProcessing(true);
    try {
      const res = await fetch("/api/salary/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: bulkAccountId, month: selectedMonth }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Bulk salary processing failed");
      }

      const result = (await res.json()) as BulkSalaryResult;

      if (result.errors.length > 0) {
        toast.warning(
          `Processed ${result.processed}, skipped ${result.skipped}, ${result.errors.length} error(s). Check console for details.`,
        );
        console.error("Bulk salary errors:", result.errors);
      } else {
        toast.success(
          `Bulk salary complete — ${result.processed} processed, ${result.skipped} already paid`,
        );
      }

      setBulkDialogOpen(false);
      void fetchPayrollGrid();
      void fetchPaymentHistory();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Bulk salary processing failed";
      toast.error(message);
    } finally {
      setIsBulkProcessing(false);
    }
  }

  async function handleDeletePayment() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/salary/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Delete failed");
      }
      toast.success(
        `Salary payment for ${deleteTarget.staff?.name ?? "staff"} deleted`,
      );
      setDeleteTarget(null);
      void fetchPayrollGrid();
      void fetchPaymentHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setIsDeleting(false);
    }
  }
  // ── Derived values ─────────────────────────────────────────────────────────

  const unpaidRows = payrollRows.filter(
    (r) => r.payment === null && r.salary > 0,
  );
  const paidCount = payrollRows.filter((r) => r.payment !== null).length;
  const totalPayroll = payrollRows.reduce((sum, r) => sum + r.salary, 0);
  const paidAmount = payrollRows
    .filter((r) => r.payment !== null)
    .reduce((sum, r) => sum + r.salary, 0);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <PageTransition>
      <div className="flex flex-col gap-6">
        {/* ── Month selector + bulk action ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="rounded-2xl border border-white/60 bg-surface/70 px-4 py-3 shadow-sm backdrop-blur-md flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          style={{ WebkitBackdropFilter: "blur(12px)" }}
        >
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-text-primary">
              Payroll Month
            </label>
            <Select
              value={selectedMonth}
              onValueChange={(val) => {
                if (val != null) setSelectedMonth(val);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <span>
                  {monthOptions.find((opt) => opt.value === selectedMonth)
                    ?.label ?? formatMonth(selectedMonth)}
                </span>
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="flex items-center gap-2">
                      {opt.value === selectedMonth && (
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
                      )}
                      {opt.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Process All — gradient + shine */}
          <motion.div
            whileHover={{ scale: unpaidRows.length > 0 ? 1.03 : 1 }}
            whileTap={{ scale: unpaidRows.length > 0 ? 0.97 : 1 }}
            transition={{ duration: 0.15 }}
            className="shrink-0"
          >
            <Button
              onClick={() => setBulkDialogOpen(true)}
              disabled={unpaidRows.length === 0 || isGridLoading}
              className="relative overflow-hidden bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] shadow-md shadow-blue-500/25 disabled:opacity-50"
            >
              {/* Shine sweep */}
              <motion.span
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]"
                animate={
                  unpaidRows.length > 0 ? { translateX: ["−100%", "200%"] } : {}
                }
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  repeatDelay: 3,
                  ease: "easeInOut",
                }}
              />
              <PlayCircleIcon className="h-4 w-4" />
              Process All ({unpaidRows.length} unpaid)
            </Button>
          </motion.div>
        </motion.div>

        {/* ── Summary cards ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {!isGridLoading && payrollRows.length > 0 && (
            <motion.div
              key="stat-cards"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
              <StatCard
                delay={0}
                label="Total Staff"
                value={String(payrollRows.length)}
                icon={<UsersIcon className="h-4 w-4 text-blue-500" />}
                accent="text-blue-600"
                iconBg="bg-blue-50"
              />
              <StatCard
                delay={0.05}
                label="Paid"
                value={String(paidCount)}
                icon={<CheckCircle2Icon className="h-4 w-4 text-emerald-500" />}
                accent="text-emerald-600"
                iconBg="bg-emerald-50"
              />
              <StatCard
                delay={0.1}
                label="Unpaid"
                value={String(unpaidRows.length)}
                icon={<ClockIcon className="h-4 w-4 text-amber-500" />}
                accent="text-amber-600"
                iconBg="bg-amber-50"
              />
              <StatCard
                delay={0.15}
                label="Total Payroll"
                value={formatINR(totalPayroll)}
                icon={<BanknoteIcon className="h-4 w-4 text-brand" />}
                accent="text-blue-600"
                iconBg="bg-blue-50"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sub-label for paid amount */}
        <AnimatePresence>
          {!isGridLoading && paidAmount > 0 && paidAmount < totalPayroll && (
            <motion.p
              key="paid-sub"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="-mt-3 text-xs text-text-secondary"
            >
              {formatINR(paidAmount)} paid so far
            </motion.p>
          )}
        </AnimatePresence>

        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        <Tabs defaultValue="grid">
          <TabsList className="inline-flex gap-0.5 rounded-xl bg-surface-tertiary p-1 h-auto">
            <TabsTrigger
              value="grid"
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-text-secondary transition-all data-[state=active]:bg-surface data-[state=active]:text-text-primary data-[state=active]:shadow-sm"
            >
              <Wallet className="h-4 w-4" />
              Payroll Grid
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary transition-all data-[state=active]:bg-surface data-[state=active]:text-text-primary data-[state=active]:shadow-sm"
            >
              Payment History
            </TabsTrigger>
          </TabsList>

          {/* ─── Payroll Grid tab ─── */}
          <TabsContent value="grid" className="mt-4">
            {isGridLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border bg-surface p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                    <Skeleton className="h-7 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            ) : payrollRows.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl border border-dashed border-border-light bg-surface-secondary/50 p-12 text-center"
              >
                <UsersIcon className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm text-text-secondary">
                  No active staff found. Add staff members to process payroll.
                </p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {payrollRows.map((row, index) => (
                  <PayrollStaffCard
                    key={row.id}
                    row={row}
                    index={index}
                    onProcess={setProcessTarget}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ─── Payment History tab ─── */}
          <TabsContent value="history" className="mt-4">
            <div className="flex flex-col gap-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="rounded-2xl ring-1 ring-foreground/10 bg-surface overflow-hidden shadow-sm"
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-16 text-right font-semibold text-text-primary" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isHistoryLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 6 }).map((__, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-4 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : historyResult?.payments.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-32 text-center text-text-secondary"
                        >
                          No salary payments recorded yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      historyResult?.payments.map((payment, index) => (
                        <motion.tr
                          key={payment.id}
                          custom={index}
                          variants={tableRowVariants}
                          initial="hidden"
                          animate="visible"
                          className="border-b transition-colors hover:bg-muted/50"
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium text-text-primary">
                                {payment.staff?.name ?? "Unknown"}
                              </p>
                              <p className="text-xs text-text-secondary">
                                {payment.staff?.email ?? ""}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-text-secondary">
                            {formatMonth(payment.month)}
                          </TableCell>
                          <TableCell className="text-text-secondary">
                            {formatDate(payment.payment_date)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-medium text-text-primary tabular-nums">
                            {formatINR(payment.amount)}
                          </TableCell>
                          <TableCell className="text-text-secondary text-sm max-w-xs truncate">
                            {payment.notes || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-text-tertiary hover:text-destructive hover:bg-destructive/10 transition-colors"
                              onClick={() => setDeleteTarget(payment)}
                            >
                              <Trash2Icon className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </motion.tr>
                      ))
                    )}
                  </TableBody>
                </Table>
              </motion.div>

              {/* History pagination */}
              {historyResult && historyResult.total_pages > 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25, delay: 0.15 }}
                  className="flex items-center justify-between"
                >
                  <p className="text-sm text-text-secondary">
                    Page {historyResult.page} of {historyResult.total_pages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={historyPage <= 1}
                      onClick={() => setHistoryPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={historyPage >= historyResult.total_pages}
                      onClick={() => setHistoryPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* ── Individual process dialog ──────────────────────────────────────── */}
        <Dialog
          open={processTarget != null}
          onOpenChange={(open) => {
            if (!open) setProcessTarget(null);
          }}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Process Salary</DialogTitle>
            </DialogHeader>
            {processTarget && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="space-y-3"
              >
                <p className="text-sm text-text-secondary">
                  Process salary for{" "}
                  <span className="font-semibold text-text-primary">
                    {processTarget.name}
                  </span>{" "}
                  for{" "}
                  <span className="font-semibold text-text-primary">
                    {formatMonth(selectedMonth)}
                  </span>
                  ?
                </p>
                <div className="rounded-xl border bg-muted/40 p-3 text-sm space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Staff</span>
                    <span className="font-medium text-text-primary">
                      {processTarget.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Month</span>
                    <span className="font-medium text-text-primary">
                      {formatMonth(selectedMonth)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Amount</span>
                    <span className="font-bold text-success">
                      {formatINR(processTarget.salary)}
                    </span>
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label
                    htmlFor="process-account"
                    className="text-xs uppercase tracking-wide text-text-secondary font-semibold"
                  >
                    Paid from <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={processAccountId}
                    onValueChange={(val) => {
                      if (val != null) setProcessAccountId(val);
                    }}
                  >
                    <SelectTrigger id="process-account" className="w-full">
                      <span>
                        {processAccountId
                          ? accounts.find((a) => a.id === processAccountId)?.name ??
                            "Select account"
                          : "Select account"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-text-secondary">
                  This action cannot be undone.
                </p>
              </motion.div>
            )}
            <DialogFooter>
              <motion.div
                whileHover={{ scale: isProcessing ? 1 : 1.02 }}
                whileTap={{ scale: isProcessing ? 1 : 0.97 }}
              >
                <Button
                  disabled={isProcessing}
                  onClick={handleProcessConfirm}
                  className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] shadow-sm shadow-blue-500/20"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white"
                      />
                      Processing...
                    </span>
                  ) : (
                    "Confirm"
                  )}
                </Button>
              </motion.div>
              <Button
                variant="outline"
                disabled={isProcessing}
                onClick={() => setProcessTarget(null)}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Bulk process dialog ────────────────────────────────────────────── */}
        <Dialog
          open={bulkDialogOpen}
          onOpenChange={(open) => {
            if (!open) setBulkDialogOpen(false);
          }}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Process All Salaries</DialogTitle>
            </DialogHeader>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="space-y-3"
            >
              <p className="text-sm text-text-secondary">
                Process salaries for all{" "}
                <span className="font-semibold text-text-primary">
                  {unpaidRows.length} unpaid
                </span>{" "}
                staff members for{" "}
                <span className="font-semibold text-text-primary">
                  {formatMonth(selectedMonth)}
                </span>
                ?
              </p>
              <div className="rounded-xl border bg-muted/40 p-3 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Staff to pay</span>
                  <span className="font-medium text-text-primary">
                    {unpaidRows.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Total amount</span>
                  <span className="font-bold text-success">
                    {formatINR(
                      unpaidRows.reduce((sum, r) => sum + r.salary, 0),
                    )}
                  </span>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label
                  htmlFor="bulk-account"
                  className="text-xs uppercase tracking-wide text-text-secondary font-semibold"
                >
                  Paid from <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={bulkAccountId}
                  onValueChange={(val) => {
                    if (val != null) setBulkAccountId(val);
                  }}
                >
                  <SelectTrigger id="bulk-account" className="w-full">
                    <span>
                      {bulkAccountId
                        ? accounts.find((a) => a.id === bulkAccountId)?.name ??
                          "Select account"
                        : "Select account"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-text-secondary">
                Already-paid staff will be skipped automatically. This action
                cannot be undone.
              </p>
            </motion.div>
            <DialogFooter>
              <motion.div
                whileHover={{ scale: isBulkProcessing ? 1 : 1.02 }}
                whileTap={{ scale: isBulkProcessing ? 1 : 0.97 }}
              >
                <Button
                  disabled={isBulkProcessing}
                  onClick={handleBulkProcessConfirm}
                  className="relative overflow-hidden bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] shadow-sm shadow-blue-500/20"
                >
                  {isBulkProcessing ? (
                    <span className="flex items-center gap-2">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white"
                      />
                      Processing...
                    </span>
                  ) : (
                    "Process All"
                  )}
                </Button>
              </motion.div>
              <Button
                variant="outline"
                disabled={isBulkProcessing}
                onClick={() => setBulkDialogOpen(false)}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Delete confirmation dialog */}
        <Dialog
          open={deleteTarget != null}
          onOpenChange={(open) => {
            if (!open && !isDeleting) setDeleteTarget(null);
          }}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Salary Payment</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-text-secondary">
              Are you sure you want to delete the salary payment for{" "}
              <span className="font-semibold text-text-primary">
                {deleteTarget?.staff?.name ?? "this staff member"}
              </span>
              ? This action cannot be undone.
            </p>
            {deleteTarget && (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Month</span>
                  <span className="font-medium text-text-primary">
                    {formatMonth(deleteTarget.month)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Amount</span>
                  <span className="font-semibold text-text-primary">
                    {formatINR(deleteTarget.amount)}
                  </span>
                </div>
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="destructive"
                onClick={handleDeletePayment}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <span className="flex items-center gap-2">
                    <Loader2Icon className="h-4 w-4 animate-spin" />
                    Deleting...
                  </span>
                ) : (
                  "Delete"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className={"ml-2"}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
