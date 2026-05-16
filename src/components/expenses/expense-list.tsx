"use client";

import { formatINR } from "@/lib/format";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { ExportButton } from "@/components/export-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog";
import { PageTransition, tableRowVariants } from "@/components/ui/animated";
import {
  EXPENSE_CATEGORY_VALUES,
  type ExpenseCategory,
} from "@/lib/schemas/expense";
import type { Expense } from "@/types/database";

interface ExpenseListResult {
  expenses: Expense[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

const CATEGORY_STYLE: Record<
  ExpenseCategory,
  { bg: string; text: string; dot: string }
> = {
  Utilities: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  Maintenance: {
    bg: "bg-orange-50 dark:bg-orange-950/40",
    text: "text-orange-700 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  Supplies: {
    bg: "bg-violet-50 dark:bg-violet-950/40",
    text: "text-violet-700 dark:text-violet-400",
    dot: "bg-violet-500",
  },
  Transport: {
    bg: "bg-cyan-50 dark:bg-cyan-950/40",
    text: "text-cyan-700 dark:text-cyan-400",
    dot: "bg-cyan-500",
  },
  Inventory: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  Salary: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  Rent: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  Other: {
    bg: "bg-slate-100 dark:bg-slate-800/50",
    text: "text-slate-600 dark:text-slate-400",
    dot: "bg-slate-400",
  },
};

const FALLBACK_STYLE = {
  bg: "bg-slate-100 dark:bg-slate-800/50",
  text: "text-slate-600 dark:text-slate-400",
  dot: "bg-slate-400",
};

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ExpenseList() {
  const [result, setResult] = React.useState<ExpenseListResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Filters
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("");
  const [page, setPage] = React.useState(1);

  // Dialog state
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const fetchExpenses = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (categoryFilter) params.set("category", categoryFilter);
      params.set("page", String(page));
      params.set("per_page", "20");

      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to load expenses");
      }
      const data = (await res.json()) as ExpenseListResult;
      setResult(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load expenses";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo, categoryFilter, page]);

  React.useEffect(() => {
    void fetchExpenses();
  }, [fetchExpenses]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, categoryFilter]);

  function handleDeleteClick(expense: Expense) {
    setDeleteTarget(expense);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/expenses/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Delete failed");
      }
      toast.success("Expense deleted");
      setDeleteTarget(null);
      void fetchExpenses();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  function handleFormSuccess() {
    void fetchExpenses();
  }

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setCategoryFilter("");
    setPage(1);
  }

  const hasFilters = dateFrom || dateTo || categoryFilter;

  // Compute total of visible page
  const pageTotal = result?.expenses.reduce((sum, e) => sum + e.amount, 0) ?? 0;

  return (
    <PageTransition>
      <div className="flex flex-col gap-5">
        {/* ── Frosted toolbar ────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.35,
            delay: 0.05,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="rounded-2xl border border-white/60 bg-surface/70 backdrop-blur-md shadow-sm px-4 py-3"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-1 flex-wrap items-end gap-2">
              {/* Category filter */}
              <div className="grid gap-1">
                <label className="text-xs text-text-secondary font-medium">
                  Category
                </label>
                <Select
                  value={categoryFilter}
                  onValueChange={(val) =>
                    setCategoryFilter(
                      val == null || val === "__all__" ? "" : val,
                    )
                  }
                >
                  <SelectTrigger className="w-[150px] bg-surface/80 focus:ring-2 focus:ring-brand/30 focus:border-brand">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Categories</SelectItem>
                    {EXPENSE_CATEGORY_VALUES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        <span className="flex items-center gap-2">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${(CATEGORY_STYLE[cat] ?? FALLBACK_STYLE).dot}`}
                          />
                          {cat}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date from */}
              <div className="grid gap-1">
                <label
                  className="text-xs text-text-secondary font-medium"
                  htmlFor="date_from"
                >
                  From
                </label>
                <Input
                  id="date_from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-[150px] bg-surface/80"
                />
              </div>

              {/* Date to */}
              <div className="grid gap-1">
                <label
                  className="text-xs text-text-secondary font-medium"
                  htmlFor="date_to"
                >
                  To
                </label>
                <Input
                  id="date_to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-[150px] bg-surface/80"
                />
              </div>

              <AnimatePresence>
                {hasFilters && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.18 }}
                    className="self-end"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-text-secondary hover:text-text-primary"
                    >
                      Clear filters
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end">
              {result && result.expenses.length > 0 && (
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-brand/10 dark:bg-brand/20 px-3 py-1.5 text-xs font-semibold text-brand">
                  Total: {formatINR(pageTotal)}
                  <span className="text-brand/60 font-normal">
                    ({result.expenses.length}/{result.total})
                  </span>
                </span>
              )}
              <ExportButton
                data={result?.expenses ?? []}
                columns={[
                  { key: "date", label: "Date" },
                  { key: "category", label: "Category" },
                  { key: "description", label: "Description" },
                  { key: "amount", label: "Amount" },
                ]}
                filename="expenses"
                disabled={isLoading || !result?.expenses.length}
              />
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.15 }}
              >
                <Button
                  onClick={() => setFormOpen(true)}
                  className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/30 transition-shadow"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Expense
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* ── Count summary line ─────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.p
              key={`summary-${result.total}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-sm text-text-secondary"
            >
              {result.total === 0
                ? "No expenses found"
                : `Showing ${result.expenses.length} of ${result.total} expense${result.total !== 1 ? "s" : ""}`}
            </motion.p>
          )}
        </AnimatePresence>

        {/* ── Animated table ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            delay: 0.1,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="rounded-2xl ring-1 ring-foreground/10 bg-surface overflow-hidden shadow-sm"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-12 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : result?.expenses.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-32 text-center text-text-secondary"
                  >
                    {hasFilters
                      ? "No expenses match the current filters."
                      : 'No expenses recorded yet. Click "Add Expense" to get started.'}
                  </TableCell>
                </TableRow>
              ) : (
                result?.expenses.map((expense, index) => (
                  <motion.tr
                    key={expense.id}
                    custom={index}
                    variants={tableRowVariants}
                    initial="hidden"
                    animate="visible"
                    className="border-b transition-colors hover:bg-slate-50/60"
                  >
                    <TableCell className="text-text-secondary whitespace-nowrap">
                      {formatDate(expense.date)}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const s =
                          CATEGORY_STYLE[expense.category as ExpenseCategory] ??
                          FALLBACK_STYLE;
                        return (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.bg} ${s.text}`}
                          >
                            <span
                              className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`}
                            />
                            {expense.category}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-text-primary max-w-xs truncate">
                      {expense.description}
                    </TableCell>
                    <TableCell className="text-right font-medium text-text-primary whitespace-nowrap tabular-nums">
                      {formatINR(expense.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <motion.div
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        transition={{ duration: 0.15 }}
                        className="inline-flex"
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete expense: ${expense.description}`}
                          onClick={() => handleDeleteClick(expense)}
                          className="hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2Icon className="h-4 w-4 text-destructive" />
                        </Button>
                      </motion.div>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </motion.div>

        {/* ── Pagination ─────────────────────────────────────────────────────── */}
        {result && result.total_pages > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="flex items-center justify-between"
          >
            <p className="text-sm text-text-secondary">
              Page {result.page} of {result.total_pages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= result.total_pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Add Expense Dialog ──────────────────────────────────────────────── */}
        <ExpenseFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          onSuccess={handleFormSuccess}
        />

        {/* ── Delete Confirmation Dialog ──────────────────────────────────────── */}
        <Dialog
          open={deleteTarget != null}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Expense</DialogTitle>
            </DialogHeader>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="space-y-3"
            >
              <p className="text-sm text-text-secondary">
                Are you sure you want to delete this expense?
              </p>
              {deleteTarget && (
                <div className="rounded-xl border bg-muted/40 p-3 text-sm space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Category</span>
                    <span className="flex items-center gap-1.5 font-medium text-text-primary">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${(CATEGORY_STYLE[deleteTarget.category as ExpenseCategory] ?? FALLBACK_STYLE).dot}`}
                      />
                      {deleteTarget.category}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Amount</span>
                    <span className="font-semibold text-danger">
                      {formatINR(deleteTarget.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Date</span>
                    <span className="font-medium text-text-primary">
                      {formatDate(deleteTarget.date)}
                    </span>
                  </div>
                </div>
              )}
              <p className="text-xs text-text-secondary">
                This action cannot be undone.
              </p>
            </motion.div>
            <DialogFooter>
              <Button
                variant="destructive"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className=""
              >
                {isDeleting ? (
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
                    Deleting...
                  </span>
                ) : (
                  "Delete"
                )}
              </Button>
              <Button
                variant="outline"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
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
