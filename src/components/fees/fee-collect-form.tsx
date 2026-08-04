"use client";

import { formatINR } from "@/lib/format";
import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2Icon,
  PrinterIcon,
  SearchIcon,
  CopyIcon,
  CheckIcon,
  SparklesIcon,
  UserCircleIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
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
  AnimatedCounter,
  SlideIn,
  tableRowVariants,
} from "@/components/ui/animated";
import {
  collectFeeSchema,
  type CollectFeeInput,
} from "@/lib/schemas/fee-transaction";
import type { Student, FeeTransaction, Account } from "@/types/database";
import type { FeeConfigWithHeads } from "@/services/fee-config";
import type { FeeSummary, CollectFeeOutput } from "@/services/fee-transaction";
import { todayISO, todayParts } from "@/lib/dates";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const CURRENT_ACADEMIC_YEAR: string = (() => {
  const { year, month } = todayParts();
  const startYear = month >= 6 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
})();

const ACADEMIC_YEAR_OPTIONS: readonly string[] = (() => {
  const [currentStart] = CURRENT_ACADEMIC_YEAR.split("-").map(Number);
  const start = currentStart ?? todayParts().year;
  return [
    `${start + 1}-${start + 2}`,
    `${start}-${start + 1}`,
    `${start - 1}-${start}`,
    `${start - 2}-${start - 1}`,
  ];
})();

// ─── Animated confetti particle ──────────────────────────────────────────────

interface ConfettiParticle {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
}

const CONFETTI_COLORS = [
  "#2563EB",
  "#16A34A",
  "#F59E0B",
  "#EC4899",
  "#8B5CF6",
  "#06B6D4",
];

function Confetti() {
  const particles = React.useMemo<ConfettiParticle[]>(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length] ?? "#2563EB",
        delay: Math.random() * 0.6,
        duration: 1.2 + Math.random() * 0.8,
      })),
    []
  );

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
      aria-hidden="true"
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute top-0 w-2 h-2 rounded-sm"
          style={{ left: `${p.x}%`, backgroundColor: p.color }}
          initial={{ y: -10, opacity: 1, rotate: 0, scale: 1 }}
          animate={{
            y: 120,
            opacity: [1, 1, 0],
            rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
            scale: [1, 0.8, 0.4],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeIn",
          }}
        />
      ))}
    </div>
  );
}

// ─── Summary stat card ────────────────────────────────────────────────────────

interface SummaryStatCardProps {
  label: string;
  value: string;
  variant: "blue" | "green" | "red" | "amber";
  delay?: number;
}

function SummaryStatCard({ label, value, variant, delay = 0 }: SummaryStatCardProps) {
  const styles = {
    blue: {
      wrapper: "bg-gradient-to-br from-blue-50 to-blue-100/60 border-blue-200",
      label: "text-blue-600",
      value: "text-blue-700",
      dot: "bg-blue-400",
    },
    green: {
      wrapper: "bg-gradient-to-br from-green-50 to-emerald-100/60 border-green-200",
      label: "text-green-600",
      value: "text-green-700",
      dot: "bg-green-400",
    },
    red: {
      wrapper: "bg-gradient-to-br from-red-50 to-rose-100/60 border-red-200",
      label: "text-red-600",
      value: "text-red-700",
      dot: "bg-red-400",
    },
    amber: {
      wrapper: "bg-gradient-to-br from-amber-50 to-yellow-100/60 border-amber-200",
      label: "text-amber-600",
      value: "text-amber-700",
      dot: "bg-amber-400",
    },
  } as const;

  const s = styles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`rounded-xl border p-4 flex flex-col gap-1.5 ${s.wrapper}`}
    >
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
        <span className={`text-xs font-semibold uppercase tracking-wide ${s.label}`}>
          {label}
        </span>
      </div>
      <AnimatedCounter value={value} className={`text-xl font-bold ${s.value}`} />
    </motion.div>
  );
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <motion.button
      type="button"
      onClick={() => void handleCopy()}
      whileTap={{ scale: 0.93 }}
      className="inline-flex items-center gap-1 rounded-md border border-green-300 bg-surface px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
      aria-label="Copy receipt number"
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.span
            key="check"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1"
          >
            <CheckIcon className="h-3 w-3" />
            Copied
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1"
          >
            <CopyIcon className="h-3 w-3" />
            Copy
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ─── Success checkmark ────────────────────────────────────────────────────────

function AnimatedCheckmark() {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 18,
        delay: 0.1,
      }}
      className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100"
    >
      <CheckCircle2Icon className="h-6 w-6 text-green-600" />
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FeeCollectForm() {
  const searchParams = useSearchParams();

  // Student search
  const [searchTerm, setSearchTerm] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<Student[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null);

  // Academic year (defaults to current; user can switch to previous year)
  const [selectedAcademicYear, setSelectedAcademicYear] =
    React.useState<string>(CURRENT_ACADEMIC_YEAR);

  // Fee config & summary
  const [feeConfig, setFeeConfig] = React.useState<FeeConfigWithHeads | null>(null);
  const [summary, setSummary] = React.useState<FeeSummary | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = React.useState(false);

  // History
  const [history, setHistory] = React.useState<FeeTransaction[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(false);

  // Payment form
  const [isPending, setIsPending] = React.useState(false);
  const [successReceipt, setSuccessReceipt] = React.useState<string | null>(null);
  const [showConfetti, setShowConfetti] = React.useState(false);

  // Accounts (payment buckets)
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  React.useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/accounts");
        if (res.ok) setAccounts((await res.json()) as Account[]);
      } catch {
        // silent; account select shows empty list
      }
    })();
  }, []);

  const accountNameById = React.useMemo(
    () => new Map(accounts.map((a) => [a.id, a.name])),
    [accounts],
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CollectFeeInput>({
    resolver: zodResolver(collectFeeSchema),
    defaultValues: {
      student_id: "",
      fee_config_id: "",
      account_id: "",
      paid_amount: 0,
      discount_amount: 0,
      discount_reason: "",
    },
  });

  const discountAmount = watch("discount_amount") ?? 0;
  const accountIdValue = watch("account_id");

  // ── Student search ──────────────────────────────────────────────────────────

  const searchTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearchTerm(val);
    setSearchResults([]);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (val.trim().length < 2) return;

    searchTimeout.current = setTimeout(() => {
      void doSearch(val.trim());
    }, 300);
  }

  async function doSearch(term: string) {
    setIsSearching(true);
    try {
      const params = new URLSearchParams({ search: term, per_page: "10" });
      const res = await fetch(`/api/students?${params.toString()}`);
      if (!res.ok) {
        toast.error("Student search failed");
        return;
      }
      const body = (await res.json()) as { students: Student[] };
      setSearchResults(body.students ?? []);
    } catch {
      toast.error("Student search failed");
    } finally {
      setIsSearching(false);
    }
  }

  function handleClearSearch() {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    setSearchTerm("");
    setSearchResults([]);
    setSelectedStudent(null);
    setFeeConfig(null);
    setSummary(null);
    setHistory([]);
    setSuccessReceipt(null);
    reset({
      student_id: "",
      fee_config_id: "",
      account_id: "",
      paid_amount: 0,
      discount_amount: 0,
      discount_reason: "",
    });
  }

  async function handleSelectStudent(student: Student) {
    setSelectedStudent(student);
    setSearchResults([]);
    setSearchTerm(`${student.name} (${student.admission_no})`);
    setFeeConfig(null);
    setSummary(null);
    setHistory([]);
    setSuccessReceipt(null);
    reset({
      student_id: student.id,
      fee_config_id: "",
      account_id: "",
      paid_amount: 0,
      discount_amount: 0,
      discount_reason: "",
    });

    await loadStudentData(student, selectedAcademicYear);
  }

  function handleAcademicYearChange(year: string) {
    setSelectedAcademicYear(year);
    setSuccessReceipt(null);
    if (selectedStudent) {
      setFeeConfig(null);
      setSummary(null);
      void loadStudentData(selectedStudent, year);
    }
  }

  // ── Load fee config + summary + history after student selection ─────────────

  async function loadStudentData(student: Student, academicYear: string) {
    setIsLoadingConfig(true);
    setIsLoadingHistory(true);

    try {
      const cfgParams = new URLSearchParams({
        academic_year: academicYear,
      });
      const cfgRes = await fetch(`/api/fee-configs?${cfgParams.toString()}`);
      if (cfgRes.ok) {
        const allConfigs = (await cfgRes.json()) as FeeConfigWithHeads[];
        // Prefer the student's assigned fee structure; fall back to a
        // grade match for students without an assignment.
        const matched =
          allConfigs.find((c) => c.id === student.fee_config_id) ??
          allConfigs.find((c) => c.grade === student.grade) ??
          null;
        setFeeConfig(matched);

        if (matched) {
          setValue("fee_config_id", matched.id);

          const summaryParams = new URLSearchParams({
            student_id: student.id,
            fee_config_id: matched.id,
          });
          const summaryRes = await fetch(
            `/api/fees/summary?${summaryParams.toString()}`
          );
          if (summaryRes.ok) {
            const summaryData = (await summaryRes.json()) as FeeSummary;
            setSummary(summaryData);
            setValue(
              "paid_amount",
              summaryData.pending_balance > 0 ? summaryData.pending_balance : 0
            );
          }
        }
      }
    } catch {
      toast.error("Failed to load fee configuration");
    } finally {
      setIsLoadingConfig(false);
    }

    try {
      const historyParams = new URLSearchParams({ student_id: student.id });
      const historyRes = await fetch(
        `/api/fees/history?${historyParams.toString()}`
      );
      if (historyRes.ok) {
        const historyData = (await historyRes.json()) as FeeTransaction[];
        setHistory(historyData);
      }
    } catch {
      // Non-critical; don't block the form
    } finally {
      setIsLoadingHistory(false);
    }
  }

  // ── Auto-select student from URL query param ────────────────────────────────

  const preloadedRef = React.useRef(false);
  React.useEffect(() => {
    const studentId = searchParams.get("student_id");
    if (!studentId || preloadedRef.current) return;
    preloadedRef.current = true;

    void (async () => {
      try {
        const res = await fetch(`/api/students/${studentId}`);
        if (!res.ok) return;
        const student = (await res.json()) as Student;
        handleSelectStudent(student);
      } catch {
        // Ignore — student not found or network error
      }
    })();
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Payment submission ──────────────────────────────────────────────────────

  async function onSubmit(data: CollectFeeInput) {
    setIsPending(true);
    setSuccessReceipt(null);
    try {
      const res = await fetch("/api/fees/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errBody = (await res.json()) as { error?: string };
        throw new Error(errBody.error ?? "Payment failed");
      }

      const result = (await res.json()) as CollectFeeOutput;
      setSuccessReceipt(result.receipt_no);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2500);
      toast.success(`Payment recorded — Receipt: ${result.receipt_no}`);

      if (selectedStudent && feeConfig) {
        const summaryParams = new URLSearchParams({
          student_id: selectedStudent.id,
          fee_config_id: feeConfig.id,
        });
        const summaryRes = await fetch(
          `/api/fees/summary?${summaryParams.toString()}`
        );
        if (summaryRes.ok) {
          const updated = (await summaryRes.json()) as FeeSummary;
          setSummary(updated);
        }

        const historyParams = new URLSearchParams({
          student_id: selectedStudent.id,
        });
        const historyRes = await fetch(
          `/api/fees/history?${historyParams.toString()}`
        );
        if (historyRes.ok) {
          const updated = (await historyRes.json()) as FeeTransaction[];
          setHistory(updated);
        }

        reset({
          student_id: selectedStudent.id,
          fee_config_id: feeConfig.id,
          account_id: "",
          paid_amount: 0,
          discount_amount: 0,
          discount_reason: "",
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed";
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <PageTransition>
      <div className="flex flex-col gap-6 max-w-4xl">

        {/* ── Student search ── */}
        <div
          className={`relative rounded-xl border bg-surface p-5 flex flex-col gap-4 transition-all duration-300 ${
            selectedStudent
              ? "border-brand/20"
              : "border-border-light"
          }`}
        >

          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <SearchIcon className="h-4 w-4 text-brand" />
            Student Search
          </h2>

          <div className="relative">
            <Label htmlFor="student-search" className="sr-only">
              Search student
            </Label>
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
            <Input
              id="student-search"
              className="pl-9 pr-9 transition-all focus-visible:ring-brand/30 focus-visible:border-brand"
              placeholder="Search by name or admission number..."
              value={searchTerm}
              onChange={handleSearchChange}
              autoComplete="off"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-full text-text-tertiary hover:bg-surface-tertiary hover:text-text-primary transition-colors"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            )}
            {/* Dropdown results */}
            <AnimatePresence>
              {(isSearching || searchResults.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute z-10 mt-1 w-full rounded-lg border bg-surface shadow-lg overflow-hidden"
                >
                  {isSearching ? (
                    <div className="p-3 text-sm text-text-secondary flex items-center gap-2">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                        className="inline-block h-3 w-3 rounded-full border-2 border-brand border-t-transparent"
                      />
                      Searching...
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-3 text-sm text-text-secondary">No students found</div>
                  ) : (
                    searchResults.map((student, idx) => (
                      <motion.button
                        key={student.id}
                        type="button"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className="w-full text-left px-4 py-2.5 hover:bg-surface-tertiary transition-colors flex items-center gap-3 group"
                        onClick={() => void handleSelectStudent(student)}
                      >
                        <UserCircleIcon className="h-5 w-5 text-text-tertiary group-hover:text-brand transition-colors shrink-0" />
                        <div>
                          <span className="font-medium text-text-primary">
                            {student.name}
                          </span>
                          <span className="ml-2 text-xs text-text-secondary">
                            {student.admission_no} &middot; Grade {student.grade} -{" "}
                            {student.section}
                          </span>
                        </div>
                      </motion.button>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Expanded student details slide-down */}
          <AnimatePresence>
            {selectedStudent && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="overflow-hidden"
              >
                <div className="flex items-start justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#2563EB] to-[#3B82F6] text-white font-bold text-sm shrink-0">
                      {selectedStudent.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-text-primary">
                        {selectedStudent.name}
                      </h3>
                      <p className="text-sm text-text-secondary">
                        {selectedStudent.admission_no} &middot; Grade{" "}
                        {selectedStudent.grade} - {selectedStudent.section}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Label
                      htmlFor="academic_year"
                      className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary"
                    >
                      Academic Year
                    </Label>
                    <Select
                      value={selectedAcademicYear}
                      onValueChange={(val) => {
                        if (val != null) handleAcademicYearChange(val);
                      }}
                    >
                      <SelectTrigger
                        id="academic_year"
                        className="h-8 w-[130px] text-xs"
                      >
                        <span>{selectedAcademicYear}</span>
                      </SelectTrigger>
                      <SelectContent>
                        {ACADEMIC_YEAR_OPTIONS.map((y) => (
                          <SelectItem key={y} value={y}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isLoadingConfig && (
                      <span className="text-[10px] text-text-secondary flex items-center gap-1">
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                          className="inline-block h-2.5 w-2.5 rounded-full border-2 border-brand border-t-transparent"
                        />
                        Loading...
                      </span>
                    )}
                  </div>
                </div>

                {/* Fee config info */}
                {!isLoadingConfig && feeConfig && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="mt-2 text-xs text-text-secondary bg-surface-secondary rounded-lg px-3 py-2 border"
                  >
                    <span className="font-medium text-text-primary">Fee Config:</span>{" "}
                    {feeConfig.academic_year} &mdash;{" "}
                    {feeConfig.fee_heads.map((h) => h.name).join(", ")}
                  </motion.div>
                )}
                {!isLoadingConfig && !feeConfig && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800"
                  >
                    No fee configuration found for Grade {selectedStudent.grade} in{" "}
                    {selectedAcademicYear}. Please set up a fee configuration first.
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Fee summary cards ── */}
        <AnimatePresence>
          {selectedStudent && (
            <>
              {isLoadingConfig ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-3 gap-3"
                >
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-20 rounded-xl" />
                  ))}
                </motion.div>
              ) : summary ? (
                <div className="grid grid-cols-3 gap-3">
                  <SummaryStatCard
                    label="Total Fee"
                    value={formatINR(summary.total_fee)}
                    variant="blue"
                    delay={0}
                  />
                  <SummaryStatCard
                    label="Paid"
                    value={formatINR(summary.total_paid)}
                    variant="green"
                    delay={0.07}
                  />
                  <SummaryStatCard
                    label="Pending"
                    value={formatINR(summary.pending_balance)}
                    variant={summary.pending_balance > 0 ? "red" : "green"}
                    delay={0.14}
                  />
                </div>
              ) : null}
            </>
          )}
        </AnimatePresence>

        {/* ── Success banner ── */}
        <AnimatePresence>
          {successReceipt && (
            <motion.div
              key="success-banner"
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="relative rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 px-5 py-4 flex items-center gap-4 overflow-hidden"
            >
              {showConfetti && <Confetti />}
              <AnimatedCheckmark />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-green-800 flex items-center gap-1.5">
                  <SparklesIcon className="h-3.5 w-3.5 text-green-500" />
                  Payment recorded successfully
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-sm text-green-700">
                    Receipt:{" "}
                    <span className="font-mono font-bold">{successReceipt}</span>
                  </p>
                  <CopyButton text={successReceipt} />
                </div>
              </div>
              <Link
                href={`/dashboard/fees/receipt/${successReceipt}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:from-green-700 hover:to-emerald-700 transition-all shrink-0 shadow-sm"
              >
                <PrinterIcon className="h-3.5 w-3.5" />
                Print Receipt
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Collection form ── */}
        <AnimatePresence>
          {selectedStudent && feeConfig && summary && summary.pending_balance > 0 && (
            <SlideIn direction="right" delay={0.1}>
              <div className="rounded-xl border border-border-light bg-surface overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-border-light bg-surface-secondary/50">
                  <h2 className="text-sm font-semibold text-text-primary tracking-wide">
                    Record Payment
                  </h2>
                  <span className="text-xs font-medium text-danger bg-danger-light rounded-full px-2.5 py-0.5">
                    Due: {formatINR(summary.pending_balance)}
                  </span>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} noValidate className="p-5">
                  <input type="hidden" {...register("student_id")} />
                  <input type="hidden" {...register("fee_config_id")} />

                  <div className="grid gap-5">
                    {/* Amount row — Paid + Discount side by side */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Paid Amount */}
                      <div className="grid gap-1.5">
                        <Label htmlFor="paid_amount" className="text-xs font-medium text-text-secondary">
                          Paid Amount (Rs) <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-text-tertiary">₹</span>
                          <Input
                            id="paid_amount"
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="0.00"
                            aria-invalid={!!errors.paid_amount}
                            className="pl-8 h-11 text-lg font-semibold transition-all focus-visible:ring-brand/30 focus-visible:border-brand"
                            {...register("paid_amount", { valueAsNumber: true })}
                          />
                        </div>
                        {errors.paid_amount && (
                          <p className="text-xs text-destructive">{errors.paid_amount.message}</p>
                        )}
                      </div>

                      {/* Discount Amount */}
                      <div className="grid gap-1.5">
                        <Label htmlFor="discount_amount" className="text-xs font-medium text-text-secondary">
                          Discount (Rs)
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-text-tertiary">₹</span>
                          <Input
                            id="discount_amount"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            aria-invalid={!!errors.discount_amount}
                            className="pl-8 h-11 text-lg font-semibold transition-all focus-visible:ring-brand/30 focus-visible:border-brand"
                            {...register("discount_amount", { valueAsNumber: true })}
                          />
                        </div>
                        {errors.discount_amount && (
                          <p className="text-xs text-destructive">{errors.discount_amount.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Account + Date side by side */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-1.5">
                        <Label htmlFor="account_id" className="text-xs font-medium text-text-secondary">
                          Account <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={accountIdValue ?? ""}
                          onValueChange={(val) => {
                            if (val != null) {
                              setValue("account_id", val, { shouldValidate: true });
                            }
                          }}
                        >
                          <SelectTrigger
                            id="account_id"
                            className="w-full !h-11"
                            aria-invalid={!!errors.account_id}
                          >
                            <span>
                              {accountIdValue
                                ? accountNameById.get(accountIdValue) ?? "Select account"
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
                        {errors.account_id && (
                          <p className="text-xs text-destructive">{errors.account_id.message}</p>
                        )}
                      </div>

                      <div className="grid gap-1.5">
                        <Label htmlFor="payment_date" className="text-xs font-medium text-text-secondary">
                          Payment Date
                        </Label>
                        <Input
                          id="payment_date"
                          type="date"
                          defaultValue={todayISO()}
                          className="h-11 transition-all focus-visible:ring-brand/30 focus-visible:border-brand"
                          {...register("payment_date")}
                        />
                        {errors.payment_date && (
                          <p className="text-xs text-destructive">{errors.payment_date.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Discount Reason — slides in when discount > 0 */}
                    <AnimatePresence>
                      {Number(discountAmount) > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="grid gap-1.5">
                            <Label htmlFor="discount_reason" className="text-xs font-medium text-text-secondary">
                              Discount Reason <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="discount_reason"
                              placeholder="Reason for discount..."
                              aria-invalid={!!errors.discount_reason}
                              className="h-11 transition-all focus-visible:ring-brand/30 focus-visible:border-brand"
                              {...register("discount_reason")}
                            />
                            {errors.discount_reason && (
                              <p className="text-xs text-destructive">{errors.discount_reason.message}</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Submit */}
                    <motion.div whileTap={{ scale: isPending ? 1 : 0.98 }}>
                      <Button
                        type="submit"
                        disabled={isPending}
                        className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] shadow-md shadow-brand/20 transition-all"
                      >
                        {isPending ? (
                          <span className="flex items-center gap-2">
                            <motion.span
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                              className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent"
                            />
                            Processing Payment...
                          </span>
                        ) : (
                          `Collect ₹${watch("paid_amount") || 0}`
                        )}
                      </Button>
                    </motion.div>
                  </div>
                </form>
              </div>
            </SlideIn>
          )}
        </AnimatePresence>

        {/* ── Fully paid notice ── */}
        <AnimatePresence>
          {selectedStudent && feeConfig && summary && summary.pending_balance <= 0 && (
            <motion.div
              key="fully-paid"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 px-5 py-4 flex items-center gap-3"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
              >
                <CheckCircle2Icon className="h-5 w-5 text-green-600 shrink-0" />
              </motion.div>
              <p className="text-sm font-semibold text-green-800">
                All fees are fully paid for this academic year.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Payment history ── */}
        <AnimatePresence>
          {selectedStudent && (
            <motion.div
              key="payment-history"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.4, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="rounded-xl border bg-surface overflow-hidden"
            >
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <h2 className="text-base font-semibold text-text-primary">
                  Payment History
                </h2>
                {!isLoadingHistory && history.length > 0 && (
                  <span className="text-xs text-text-secondary bg-surface-tertiary px-2 py-0.5 rounded-full">
                    {history.length} transaction{history.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingHistory ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : history.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-text-secondary text-sm"
                      >
                        No payment history for this student.
                      </TableCell>
                    </TableRow>
                  ) : (
                    history.map((tx, i) => (
                      <motion.tr
                        key={tx.id}
                        variants={tableRowVariants}
                        initial="hidden"
                        animate="visible"
                        custom={i}
                        className="border-b transition-colors hover:bg-muted/50"
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
                        <TableCell className="text-text-secondary text-sm">
                          {formatDate(tx.payment_date)}
                        </TableCell>
                        <TableCell className="text-text-secondary text-sm">
                          {accountNameById.get(tx.account_id) ?? "—"}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-text-primary">
                          {formatINR(tx.paid_amount)}
                        </TableCell>
                        <TableCell className="text-right text-text-secondary">
                          {tx.discount_amount > 0
                            ? formatINR(tx.discount_amount)
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/dashboard/fees/receipt/${tx.receipt_no}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View receipt"
                            className="inline-flex items-center justify-center rounded p-1 text-text-tertiary hover:text-text-primary hover:bg-surface-tertiary transition-colors"
                          >
                            <PrinterIcon className="h-3.5 w-3.5" />
                          </Link>
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                </TableBody>
              </Table>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
