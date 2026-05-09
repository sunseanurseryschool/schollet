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
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ACCOUNT_TYPES } from "@/lib/constants";
import {
  PageTransition,
  AnimatedCard,
  AnimatedCounter,
  StaggerContainer,
  StaggerItem,
  tableRowVariants,
} from "@/components/ui/animated";
import type { AccountType, ReferenceType } from "@/types/database";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AccountWithBalance {
  id: string;
  name: string;
  type: AccountType;
  code: string;
  is_system: boolean;
  created_at: string;
  balance: number;
}

interface JournalLine {
  id: string;
  journal_id: string;
  account_id: string;
  debit: number;
  credit: number;
}

interface JournalEntryWithLines {
  id: string;
  date: string;
  reference_type: ReferenceType;
  reference_id: string;
  description: string;
  created_at: string;
  lines: JournalLine[];
}

interface JournalListResult {
  entries: JournalEntryWithLines[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  ASSET: "Asset",
  LIABILITY: "Liability",
  INCOME: "Income",
  EXPENSE: "Expense",
};

// Left border and summary accent colors per account type
const ACCOUNT_TYPE_COLORS: Record<
  AccountType,
  {
    border: string;
    bg: string;
    text: string;
    groupBg: string;
    badgeBg: string;
    badgeText: string;
    dot: string;
  }
> = {
  ASSET: {
    border: "border-l-brand",
    bg: "bg-blue-50/60",
    text: "text-brand",
    groupBg: "bg-blue-50/40",
    badgeBg: "bg-blue-50 dark:bg-blue-950/40",
    badgeText: "text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  LIABILITY: {
    border: "border-l-amber-500",
    bg: "bg-amber-50/60",
    text: "text-amber-600",
    groupBg: "bg-amber-50/40",
    badgeBg: "bg-amber-50 dark:bg-amber-950/40",
    badgeText: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  INCOME: {
    border: "border-l-success",
    bg: "bg-green-50/60",
    text: "text-success",
    groupBg: "bg-green-50/40",
    badgeBg: "bg-emerald-50 dark:bg-emerald-950/40",
    badgeText: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  EXPENSE: {
    border: "border-l-danger",
    bg: "bg-red-50/60",
    text: "text-danger",
    groupBg: "bg-red-50/40",
    badgeBg: "bg-red-50 dark:bg-red-950/40",
    badgeText: "text-red-700 dark:text-red-400",
    dot: "bg-red-500",
  },
};

const REFERENCE_TYPE_LABEL: Record<ReferenceType, string> = {
  FEE: "Fee",
  SALARY: "Salary",
  EXPENSE: "Expense",
  OPENING_BALANCE: "Opening Balance",
};

const REFERENCE_TYPE_COLOR: Record<ReferenceType, string> = {
  FEE: "bg-blue-50 text-blue-700",
  SALARY: "bg-purple-50 text-purple-700",
  EXPENSE: "bg-red-50 text-red-700",
  OPENING_BALANCE: "bg-slate-100 text-slate-600",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Opening Balance Accounts ─────────────────────────────────────────────────

const OPENING_BALANCE_ACCOUNTS: Array<{ code: string; label: string }> = [
  { code: "AST-001", label: "Cash" },
  { code: "AST-002", label: "Bank" },
  { code: "AST-003", label: "Accounts Receivable" },
  { code: "LIA-001", label: "Accounts Payable" },
];

interface OpeningBalanceRow {
  accountId: string;
  code: string;
  label: string;
  currentBalance: number;
  inputAmount: string;
  isSaving: boolean;
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

interface PremiumTabsProps {
  tabs: ReadonlyArray<{ readonly value: string; readonly label: string }>;
  activeTab: string;
  onTabChange: (value: string) => void;
}

function PremiumTabs({ tabs, activeTab, onTabChange }: PremiumTabsProps) {
  return (
    <div className="relative flex gap-0.5 rounded-xl bg-surface-tertiary p-1">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onTabChange(tab.value)}
            className="relative z-10 flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
            style={{
              color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
            }}
          >
            {isActive && (
              <motion.span
                layoutId="accounts-tab-pill"
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

const tabContentVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  },
  exit: { opacity: 0, y: -6, transition: { duration: 0.2 } },
};

// ─── Chart of Accounts Tab ────────────────────────────────────────────────────

function ChartOfAccountsTab() {
  const [accounts, setAccounts] = React.useState<AccountWithBalance[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [typeFilter, setTypeFilter] = React.useState<string>("");

  const fetchAccounts = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set("type", typeFilter);
      const res = await fetch(`/api/accounts?${params.toString()}`);
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to load accounts");
      }
      setAccounts((await res.json()) as AccountWithBalance[]);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load accounts",
      );
    } finally {
      setIsLoading(false);
    }
  }, [typeFilter]);

  React.useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  const grouped = React.useMemo(() => {
    const map = new Map<AccountType, AccountWithBalance[]>();
    for (const acc of accounts) {
      const existing = map.get(acc.type) ?? [];
      existing.push(acc);
      map.set(acc.type, existing);
    }
    return map;
  }, [accounts]);

  const typeOrder: AccountType[] = ["ASSET", "LIABILITY", "INCOME", "EXPENSE"];

  return (
    <div className="flex flex-col gap-4">
      {/* Filter toolbar */}
      <div className="flex items-center gap-2 rounded-xl border border-border-light bg-surface/80 backdrop-blur-sm p-3 shadow-sm">
        <Select
          value={typeFilter}
          onValueChange={(val) =>
            setTypeFilter(val == null || val === "__all__" ? "" : val)
          }
        >
          <SelectTrigger className="w-[160px]">
            <span>
              {typeFilter
                ? (ACCOUNT_TYPES.find((t) => t.value === typeFilter)?.label ??
                  typeFilter)
                : "All Types"}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Types</SelectItem>
            {ACCOUNT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {typeFilter && (
          <Button variant="ghost" size="sm" onClick={() => setTypeFilter("")}>
            Clear filter
          </Button>
        )}
      </div>

      {/* Summary cards — colored by type */}
      {!isLoading && accounts.length > 0 && (
        <StaggerContainer className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {typeOrder.map((type, i) => {
            const typeAccounts = grouped.get(type) ?? [];
            const total = typeAccounts.reduce((s, a) => s + a.balance, 0);
            const colors = ACCOUNT_TYPE_COLORS[type];
            return (
              <StaggerItem key={type}>
                <AnimatedCard
                  delay={i * 0.05}
                  className={`rounded-xl border border-l-4 bg-surface p-4 ${colors.border}`}
                >
                  <p className="text-xs text-text-secondary uppercase tracking-wide mb-1">
                    {ACCOUNT_TYPE_LABEL[type]}
                  </p>
                  <AnimatedCounter
                    value={formatINR(total)}
                    className={`text-lg font-semibold ${colors.text}`}
                  />
                  <p className="text-xs text-text-tertiary mt-1">
                    {typeAccounts.length} account
                    {typeAccounts.length !== 1 ? "s" : ""}
                  </p>
                </AnimatedCard>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}

      {/* Accounts grouped by type with colored group headers */}
      <AnimatedCard
        className="rounded-xl ring-1 ring-foreground/10 bg-surface overflow-hidden"
        hover={false}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[110px]">Code</TableHead>
              <TableHead>Account Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="w-[80px] text-center">System</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : accounts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-32 text-center text-text-secondary"
                >
                  {typeFilter
                    ? "No accounts found for this type."
                    : "No accounts found."}
                </TableCell>
              </TableRow>
            ) : (
              typeOrder.flatMap((type) => {
                const typeAccounts = grouped.get(type);
                if (!typeAccounts || typeAccounts.length === 0) return [];
                const colors = ACCOUNT_TYPE_COLORS[type];

                return [
                  <motion.tr
                    key={`group-${type}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className={`border-b ${colors.groupBg}`}
                  >
                    <TableCell
                      colSpan={5}
                      className={`py-2 px-4 text-xs font-bold uppercase tracking-wider ${colors.text}`}
                    >
                      {ACCOUNT_TYPE_LABEL[type]}
                    </TableCell>
                  </motion.tr>,
                  ...typeAccounts.map((acc, i) => (
                    <motion.tr
                      key={acc.id}
                      custom={i}
                      variants={tableRowVariants}
                      initial="hidden"
                      animate="visible"
                      className={`border-b transition-colors hover:bg-muted/50 border-l-2 ${colors.border}`}
                    >
                      <TableCell className="font-mono text-xs text-text-secondary">
                        {acc.code}
                      </TableCell>
                      <TableCell className="font-medium">
                        {acc.name}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${colors.badgeBg} ${colors.badgeText}`}
                        >
                          <span
                            className={`inline-block h-1.5 w-1.5 rounded-full ${colors.dot}`}
                          />
                          {ACCOUNT_TYPE_LABEL[acc.type]}
                        </span>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-mono tabular-nums",
                          acc.balance === 0
                            ? "text-text-secondary"
                            : "font-medium",
                        )}
                      >
                        {formatINR(acc.balance)}
                      </TableCell>
                      <TableCell className="text-center">
                        {acc.is_system ? (
                          <span className="text-xs text-text-secondary">
                            Yes
                          </span>
                        ) : (
                          <span className="text-xs text-text-tertiary">No</span>
                        )}
                      </TableCell>
                    </motion.tr>
                  )),
                ];
              })
            )}
          </TableBody>
        </Table>
      </AnimatedCard>
    </div>
  );
}

// ─── Journal Entries Tab ───────────────────────────────────────────────────────

function JournalEntriesTab() {
  const [result, setResult] = React.useState<JournalListResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [refTypeFilter, setRefTypeFilter] = React.useState<string>("");
  const [dateFrom, setDateFrom] = React.useState<string>("");
  const [dateTo, setDateTo] = React.useState<string>("");
  const [page, setPage] = React.useState(1);

  const fetchEntries = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (refTypeFilter) params.set("reference_type", refTypeFilter);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      params.set("page", String(page));
      params.set("per_page", "20");
      const res = await fetch(`/api/journal?${params.toString()}`);
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to load journal entries");
      }
      setResult((await res.json()) as JournalListResult);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load journal entries",
      );
    } finally {
      setIsLoading(false);
    }
  }, [refTypeFilter, dateFrom, dateTo, page]);

  React.useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  React.useEffect(() => {
    setPage(1);
  }, [refTypeFilter, dateFrom, dateTo]);

  const hasFilters = refTypeFilter || dateFrom || dateTo;

  function clearFilters() {
    setRefTypeFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border-light bg-surface/80 backdrop-blur-sm p-3 shadow-sm">
        <Select
          value={refTypeFilter}
          onValueChange={(val) =>
            setRefTypeFilter(val == null || val === "__all__" ? "" : val)
          }
        >
          <SelectTrigger className="w-[180px]">
            <span>
              {refTypeFilter
                ? ((
                    {
                      FEE: "Fee",
                      SALARY: "Salary",
                      EXPENSE: "Expense",
                      OPENING_BALANCE: "Opening Balance",
                    } as Record<string, string>
                  )[refTypeFilter] ?? refTypeFilter)
                : "All Types"}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Types</SelectItem>
            <SelectItem value="FEE">Fee</SelectItem>
            <SelectItem value="SALARY">Salary</SelectItem>
            <SelectItem value="EXPENSE">Expense</SelectItem>
            <SelectItem value="OPENING_BALANCE">Opening Balance</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <label
            className="text-xs text-text-secondary whitespace-nowrap"
            htmlFor="je-date-from"
          >
            From
          </label>
          <Input
            id="je-date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-8 w-[145px] text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <label
            className="text-xs text-text-secondary whitespace-nowrap"
            htmlFor="je-date-to"
          >
            To
          </label>
          <Input
            id="je-date-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-8 w-[145px] text-sm"
          />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {result && (
        <p className="text-sm text-text-secondary">
          {result.total === 0
            ? "No journal entries found"
            : `Showing ${result.entries.length} of ${result.total} entr${result.total !== 1 ? "ies" : "y"}`}
        </p>
      )}

      <AnimatedCard
        className="rounded-xl ring-1 ring-foreground/10 bg-surface overflow-hidden"
        hover={false}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[110px]">Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Debits</TableHead>
              <TableHead className="text-right">Credits</TableHead>
              <TableHead className="w-[70px] text-center">Lines</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : result?.entries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-text-secondary"
                >
                  {hasFilters
                    ? "No journal entries match the current filters."
                    : "No journal entries yet. Financial transactions will appear here."}
                </TableCell>
              </TableRow>
            ) : (
              result?.entries.map((entry, i) => {
                const totalDebit = entry.lines.reduce(
                  (s, l) => s + Number(l.debit),
                  0,
                );
                const totalCredit = entry.lines.reduce(
                  (s, l) => s + Number(l.credit),
                  0,
                );
                const refColor =
                  REFERENCE_TYPE_COLOR[entry.reference_type] ??
                  "bg-slate-100 text-slate-600";
                return (
                  <motion.tr
                    key={entry.id}
                    custom={i}
                    variants={tableRowVariants}
                    initial="hidden"
                    animate="visible"
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="font-mono text-xs text-text-secondary">
                      {formatDate(entry.date)}
                    </TableCell>
                    <TableCell className="font-medium text-text-primary max-w-[260px] truncate">
                      {entry.description}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${refColor}`}
                      >
                        {REFERENCE_TYPE_LABEL[entry.reference_type]}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-semibold text-brand">
                      {formatINR(totalDebit)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-semibold text-success">
                      {formatINR(totalCredit)}
                    </TableCell>
                    <TableCell className="text-center text-xs text-text-secondary">
                      {entry.lines.length}
                    </TableCell>
                  </motion.tr>
                );
              })
            )}
          </TableBody>
        </Table>
      </AnimatedCard>

      {result && result.total_pages > 1 && (
        <div className="flex items-center justify-between">
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
        </div>
      )}
    </div>
  );
}

// ─── Opening Balances Tab ─────────────────────────────────────────────────────

function OpeningBalancesTab() {
  const [rows, setRows] = React.useState<OpeningBalanceRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [date, setDate] = React.useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0] ?? "";
  });

  const fetchBalances = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/accounts");
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to load accounts");
      }
      const accounts = (await res.json()) as AccountWithBalance[];
      const nextRows: OpeningBalanceRow[] = OPENING_BALANCE_ACCOUNTS.map(
        ({ code, label }) => {
          const found = accounts.find((a) => a.code === code);
          return {
            accountId: found?.id ?? "",
            code,
            label,
            currentBalance: found?.balance ?? 0,
            inputAmount: "",
            isSaving: false,
          };
        },
      );
      setRows(nextRows);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load accounts",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchBalances();
  }, [fetchBalances]);

  function handleAmountChange(code: string, value: string) {
    setRows((prev) =>
      prev.map((r) => (r.code === code ? { ...r, inputAmount: value } : r)),
    );
  }

  async function handleSave(row: OpeningBalanceRow) {
    const amount = parseFloat(row.inputAmount);
    if (!row.accountId) {
      toast.error(
        `Account ${row.label} not found — ensure migration 00002 has run`,
      );
      return;
    }
    if (!row.inputAmount || isNaN(amount) || amount <= 0) {
      toast.error("Enter a positive amount before saving");
      return;
    }
    if (!date) {
      toast.error("Select a date before saving");
      return;
    }

    setRows((prev) =>
      prev.map((r) => (r.code === row.code ? { ...r, isSaving: true } : r)),
    );

    try {
      const res = await fetch("/api/accounts/opening-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: row.accountId, amount, date }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to set opening balance");
      }
      toast.success(`Opening balance set for ${row.label}`);
      setRows((prev) =>
        prev.map((r) =>
          r.code === row.code ? { ...r, inputAmount: "", isSaving: false } : r,
        ),
      );
      await fetchBalances();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to set opening balance",
      );
      setRows((prev) =>
        prev.map((r) => (r.code === row.code ? { ...r, isSaving: false } : r)),
      );
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Info banner */}
      <AnimatedCard
        className="rounded-xl bg-surface ring-1 ring-foreground/10 p-4"
        hover={false}
      >
        <p className="text-sm text-text-primary font-medium mb-1">
          Set Opening Balances
        </p>
        <p className="text-sm text-text-secondary">
          Enter the starting balance for each balance-sheet account as of your
          migration date. Each entry is recorded as an immutable journal entry —
          you can set a new opening balance at any time and it will create an
          additional entry rather than overriding the previous one.
        </p>
      </AnimatedCard>

      {/* Date picker */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="opening-balance-date"
          className="text-sm font-medium text-text-primary whitespace-nowrap"
        >
          As of date
        </label>
        <Input
          id="opening-balance-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-8 w-[160px] text-sm"
        />
      </div>

      {/* Balance cards */}
      {isLoading ? (
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StaggerItem key={i}>
              <Skeleton className="h-28 rounded-xl" />
            </StaggerItem>
          ))}
        </StaggerContainer>
      ) : (
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rows.map((row, i) => (
            <StaggerItem key={row.code}>
              <AnimatedCard
                delay={i * 0.07}
                className="rounded-xl border border-l-4 border-l-brand bg-surface p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-text-primary">
                      {row.label}
                    </p>
                    <p className="text-xs font-mono text-text-secondary mt-0.5">
                      {row.code}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-secondary">
                      Current Balance
                    </p>
                    <AnimatedCounter
                      value={formatINR(row.currentBalance)}
                      className="text-sm font-semibold text-text-primary"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={row.inputAmount}
                    onChange={(e) =>
                      handleAmountChange(row.code, e.target.value)
                    }
                    className="h-8 text-sm flex-1"
                    disabled={row.isSaving}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={row.isSaving || !row.inputAmount}
                    onClick={() => void handleSave(row)}
                    className="shrink-0"
                  >
                    {row.isSaving ? "Saving..." : "Set Balance"}
                  </Button>
                </div>
              </AnimatedCard>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </div>
  );
}

// ─── Root Component ───────────────────────────────────────────────────────────

const ACCOUNTS_TABS = [
  { value: "accounts", label: "Chart of Accounts" },
  { value: "journal", label: "Journal Entries" },
  { value: "opening-balances", label: "Opening Balances" },
] as const;

type AccountsTab = (typeof ACCOUNTS_TABS)[number]["value"];

export function AccountsView() {
  const [activeTab, setActiveTab] = React.useState<AccountsTab>("accounts");

  return (
    <PageTransition>
      <div className="flex flex-col gap-5">
        <PremiumTabs
          tabs={ACCOUNTS_TABS}
          activeTab={activeTab}
          onTabChange={(v) => setActiveTab(v as AccountsTab)}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={tabContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {activeTab === "accounts" && <ChartOfAccountsTab />}
            {activeTab === "journal" && <JournalEntriesTab />}
            {activeTab === "opening-balances" && <OpeningBalancesTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
