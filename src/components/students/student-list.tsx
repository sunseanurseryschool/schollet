"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  PlusIcon,
  SearchIcon,
  PencilIcon,
  Trash2Icon,
  MoreHorizontalIcon,
  UsersIcon,
  ReceiptIcon,
  Loader2Icon,
  UserXIcon,
  UserCheckIcon,
  ArrowRightCircleIcon,
} from "lucide-react";
import { ExportButton } from "@/components/export-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  StatusBadge,
  studentStatusVariant,
  paymentModeVariant,
} from "@/components/ui/status-badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { StudentFormDialog } from "@/components/students/student-form-dialog";
import { PageTransition, tableRowVariants } from "@/components/ui/animated";
import { GRADES, SECTIONS } from "@/lib/constants";
import type { Student, FeeTransaction } from "@/types/database";
import { formatINR } from "@/lib/format";

interface StudentListResult {
  students: Student[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded bg-surface-tertiary ${className ?? ""}`}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)",
        }}
        animate={{ x: ["-100%", "200%"] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

export function StudentList() {
  const [result, setResult] = React.useState<StudentListResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Filters
  const [search, setSearch] = React.useState("");
  const [gradeFilter, setGradeFilter] = React.useState<string>("");
  const [sectionFilter, setSectionFilter] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [page, setPage] = React.useState(1);

  const debouncedSearch = useDebounce(search, 350);

  // Dialog state
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingStudent, setEditingStudent] = React.useState<Student | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = React.useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Payment history dialog state
  const [historyStudent, setHistoryStudent] = React.useState<Student | null>(
    null,
  );
  const [historyData, setHistoryData] = React.useState<FeeTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [deletingTxId, setDeletingTxId] = React.useState<string | null>(null);

  const fetchStudents = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (gradeFilter) params.set("grade", gradeFilter);
      if (sectionFilter) params.set("section", sectionFilter);
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("per_page", "20");

      const res = await fetch(`/api/students?${params.toString()}`);
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to load students");
      }
      const data = (await res.json()) as StudentListResult;
      setResult(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load students";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, gradeFilter, sectionFilter, statusFilter, page]);

  React.useEffect(() => {
    void fetchStudents();
  }, [fetchStudents]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, gradeFilter, sectionFilter, statusFilter]);

  function handleAddStudent() {
    setEditingStudent(null);
    setFormOpen(true);
  }

  function handleEditStudent(student: Student) {
    setEditingStudent(student);
    setFormOpen(true);
  }

  function handleDeleteClick(student: Student) {
    setDeleteTarget(student);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/students/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Delete failed");
      }
      toast.success(`${deleteTarget.name} has been removed`);
      setDeleteTarget(null);
      void fetchStudents();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  function handleFormSuccess() {
    void fetchStudents();
  }

  async function handleStatusChange(
    student: Student,
    newStatus: Student["status"],
  ) {
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Status update failed");
      }
      const label =
        newStatus === "active"
          ? "activated"
          : newStatus === "inactive"
            ? "deactivated"
            : "transferred";
      toast.success(`${student.name} has been ${label}`);
      void fetchStudents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Status update failed");
    }
  }

  async function handleViewHistory(student: Student) {
    setHistoryStudent(student);
    setHistoryLoading(true);
    setHistoryData([]);
    try {
      const res = await fetch(`/api/fees/history?student_id=${student.id}`);
      if (!res.ok) throw new Error("Failed to load history");
      const data = (await res.json()) as FeeTransaction[];
      setHistoryData(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load payment history",
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleDeleteTransaction(txId: string, receiptNo: string) {
    setDeletingTxId(txId);
    try {
      const res = await fetch(`/api/fees/history/${txId}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Delete failed");
      }
      toast.success(
        `Payment ${receiptNo} has been deleted and journal entry reversed`,
      );
      setHistoryData((prev) => prev.filter((t) => t.id !== txId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingTxId(null);
    }
  }

  function clearFilters() {
    setSearch("");
    setGradeFilter("");
    setSectionFilter("");
    setStatusFilter("");
    setPage(1);
  }

  const hasFilters = search || gradeFilter || sectionFilter || statusFilter;

  return (
    <PageTransition>
      <div className="flex flex-col gap-4">
        {/* Toolbar — frosted glass card */}
        <div
          className="rounded-2xl border border-white/60 bg-surface/70 px-4 py-3 shadow-sm backdrop-blur-md"
          style={{ WebkitBackdropFilter: "blur(12px)" }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
                <Input
                  placeholder="Search name, admission no..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 transition-all duration-200 focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>

              {/* Grade filter */}
              <Select
                value={gradeFilter}
                onValueChange={(val) =>
                  setGradeFilter(val == null || val === "__all__" ? "" : val)
                }
              >
                <SelectTrigger className="w-[120px] transition-all duration-200 focus:ring-2 focus:ring-brand/30 focus:border-brand">
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

              {/* Section filter */}
              <Select
                value={sectionFilter}
                onValueChange={(val) =>
                  setSectionFilter(val == null || val === "__all__" ? "" : val)
                }
              >
                <SelectTrigger className="w-[120px] transition-all duration-200 focus:ring-2 focus:ring-brand/30 focus:border-brand">
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

              {/* Status filter */}
              <Select
                value={statusFilter}
                onValueChange={(val) =>
                  setStatusFilter(val == null || val === "__all__" ? "" : val)
                }
              >
                <SelectTrigger className="w-[130px] transition-all duration-200 focus:ring-2 focus:ring-brand/30 focus:border-brand">
                  {statusFilter ? (
                    <SelectValue>
                      {statusFilter === "active"
                        ? "Active"
                        : statusFilter === "inactive"
                          ? "Inactive"
                          : "Transferred"}
                    </SelectValue>
                  ) : (
                    <SelectValue placeholder="All Status" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="transferred">Transferred</SelectItem>
                </SelectContent>
              </Select>

              <AnimatePresence>
                {hasFilters && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <ExportButton
                data={result?.students ?? []}
                columns={[
                  { key: "admission_no", label: "Admission No" },
                  { key: "name", label: "Name" },
                  { key: "grade", label: "Grade" },
                  { key: "section", label: "Section" },
                  { key: "parent_name", label: "Parent Name" },
                  { key: "parent_phone", label: "Phone" },
                  { key: "status", label: "Status" },
                ]}
                filename="students"
                disabled={isLoading || !result?.students.length}
              />
              {/* Add Student — gradient button */}
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.15 }}
              >
                <Button
                  onClick={handleAddStudent}
                  style={{
                    background:
                      "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                    boxShadow: "0 4px 14px -3px rgba(37,99,235,0.45)",
                  }}
                  className="border-0 text-white hover:opacity-90 transition-opacity duration-150"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Student
                </Button>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.p
              key={result.total}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-sm text-text-secondary"
            >
              {result.total === 0
                ? "No students found"
                : `Showing ${result.students.length} of ${result.total} student${result.total !== 1 ? "s" : ""}`}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Table card */}
        <div
          className="rounded-2xl bg-surface overflow-hidden"
          style={{
            boxShadow:
              "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px -4px rgba(0,0,0,0.06)",
          }}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admission No</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-b border-slate-50">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}>
                        <ShimmerSkeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : result?.students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center">
                    <motion.div
                      initial={{ opacity: 0, y: 12, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        duration: 0.4,
                        ease: [0.25, 0.46, 0.45, 0.94],
                      }}
                      className="flex flex-col items-center gap-3"
                    >
                      <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="rounded-full bg-surface-tertiary p-4"
                      >
                        <UsersIcon className="h-8 w-8 text-text-secondary" />
                      </motion.div>
                      <p className="text-sm text-text-secondary">
                        {hasFilters
                          ? "No students match the current filters."
                          : 'No students added yet. Click "Add Student" to get started.'}
                      </p>
                    </motion.div>
                  </TableCell>
                </TableRow>
              ) : (
                result?.students.map((student, index) => (
                  <motion.tr
                    key={student.id}
                    variants={tableRowVariants}
                    initial="hidden"
                    animate="visible"
                    custom={index}
                    className="border-b border-slate-50 transition-colors duration-150 hover:bg-slate-50/80 cursor-default"
                  >
                    <TableCell className="font-mono text-xs text-text-secondary">
                      {student.admission_no}
                    </TableCell>
                    <TableCell className="font-medium">
                      {student.name}
                    </TableCell>
                    <TableCell>{student.grade}</TableCell>
                    <TableCell>{student.section}</TableCell>
                    <TableCell className="text-text-secondary">
                      {student.parent_name || "—"}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {student.parent_phone || "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        variant={studentStatusVariant(student.status)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Actions for ${student.name}`}
                            />
                          }
                        >
                          <MoreHorizontalIcon className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-40">
                          <DropdownMenuItem
                            onClick={() => handleEditStudent(student)}
                          >
                            <PencilIcon className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleViewHistory(student)}
                          >
                            <ReceiptIcon className="h-4 w-4" />
                            View Payments
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {student.status !== "active" && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleStatusChange(student, "active")
                              }
                            >
                              <UserCheckIcon className="h-4 w-4 text-emerald-600" />
                              Mark Active
                            </DropdownMenuItem>
                          )}
                          {student.status !== "inactive" && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleStatusChange(student, "inactive")
                              }
                            >
                              <UserXIcon className="h-4 w-4 text-slate-500" />
                              Mark Inactive
                            </DropdownMenuItem>
                          )}
                          {student.status !== "transferred" && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleStatusChange(student, "transferred")
                              }
                            >
                              <ArrowRightCircleIcon className="h-4 w-4 text-amber-500" />
                              Mark Transferred
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDeleteClick(student)}
                          >
                            <Trash2Icon className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <AnimatePresence mode="wait">
          {result && result.total_pages > 1 && (
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
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
                  className="transition-all duration-150 hover:border-brand hover:text-brand"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= result.total_pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="transition-all duration-150 hover:border-brand hover:text-brand"
                >
                  Next
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add/Edit Dialog */}
        <StudentFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          student={editingStudent}
          onSuccess={handleFormSuccess}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteTarget != null}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Student</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-text-secondary">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-text-primary">
                {deleteTarget?.name}
              </span>
              ? This action cannot be undone and may affect fee records.
            </p>
            <DialogFooter>
              <Button
                variant="destructive"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
              >
                {isDeleting ? "Deleting..." : "Delete"}
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
        {/* Payment History Dialog */}
        <Dialog
          open={historyStudent != null}
          onOpenChange={(open) => {
            if (!open) setHistoryStudent(null);
          }}
        >
          <DialogContent className="sm:max-w-2xl p-0 overflow-hidden gap-0">
            <div className="px-6 pt-6 pb-4 border-b border-border-light">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ReceiptIcon className="h-5 w-5 text-brand" />
                  Payment History
                </DialogTitle>
              </DialogHeader>
              {historyStudent && (
                <p className="mt-1 text-sm text-text-secondary">
                  {historyStudent.name}{" "}
                  <span className="text-text-tertiary">
                    ({historyStudent.admission_no})
                  </span>
                </p>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2Icon className="h-6 w-6 animate-spin text-brand" />
                </div>
              ) : historyData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
                  <ReceiptIcon className="h-10 w-10 text-text-tertiary mb-3" />
                  <p className="text-sm">
                    No payment records found for this student.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow
                      style={{
                        background:
                          "linear-gradient(180deg, var(--surface-secondary) 0%, var(--surface) 100%)",
                      }}
                    >
                      <TableHead className="font-semibold text-text-primary">
                        Receipt
                      </TableHead>
                      <TableHead className="font-semibold text-text-primary">
                        Date
                      </TableHead>
                      <TableHead className="font-semibold text-text-primary text-right">
                        Paid
                      </TableHead>
                      <TableHead className="font-semibold text-text-primary text-right">
                        Discount
                      </TableHead>
                      <TableHead className="font-semibold text-text-primary">
                        Mode
                      </TableHead>
                      <TableHead className="w-16 text-right font-semibold text-text-primary">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyData.map((tx, index) => (
                      <motion.tr
                        key={tx.id}
                        variants={tableRowVariants}
                        initial="hidden"
                        animate="visible"
                        custom={index}
                        className="border-b border-border-lighter transition-colors duration-150 hover:bg-surface-tertiary/50"
                      >
                        <TableCell className="font-mono text-xs">
                          <Link
                            href={`/dashboard/fees/receipt/${tx.receipt_no}`}
                            target="_blank"
                            className="text-brand hover:underline"
                          >
                            {tx.receipt_no}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-text-primary">
                          {tx.payment_date}
                        </TableCell>
                        <TableCell className="text-sm text-right font-semibold text-success">
                          {formatINR(tx.paid_amount)}
                        </TableCell>
                        <TableCell className="text-sm text-right text-text-secondary">
                          {tx.discount_amount > 0 ? (
                            <span
                              className="text-warning"
                              title={tx.discount_reason ?? ""}
                            >
                              {formatINR(tx.discount_amount)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            variant={paymentModeVariant(tx.payment_mode)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-text-tertiary hover:text-danger hover:bg-danger-light transition-colors"
                            disabled={deletingTxId === tx.id}
                            onClick={() => {
                              if (
                                confirm(
                                  `Delete payment ${tx.receipt_no}? This will reverse the journal entry.`,
                                )
                              ) {
                                handleDeleteTransaction(tx.id, tx.receipt_no);
                              }
                            }}
                          >
                            {deletingTxId === tx.id ? (
                              <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2Icon className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {historyData.length > 0 && (
              <div className="px-6 py-3 border-t border-border-light bg-surface-secondary flex items-center justify-between">
                <span className="text-xs text-text-tertiary">
                  {historyData.length} payment
                  {historyData.length !== 1 ? "s" : ""}
                </span>
                <span className="text-sm font-semibold text-success">
                  Total:{" "}
                  {formatINR(
                    historyData.reduce((sum, t) => sum + t.paid_amount, 0),
                  )}
                </span>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
