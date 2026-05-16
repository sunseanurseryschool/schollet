"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ChevronDownIcon,
  FilterXIcon,
  PlusCircleIcon,
  PencilIcon,
  Trash2Icon,
  ActivityIcon,
  BanIcon,
  IndianRupeeIcon,
  WalletIcon,
  SlidersHorizontalIcon,
  ArrowDownIcon,
  ArrowUpIcon,
} from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AUDIT_ACTION_VALUES, AUDIT_ENTITY_VALUES } from "@/lib/schemas/audit-log";
import type { AuditLog } from "@/types/database";
import { PageTransition } from "@/components/ui/animated";

interface AuditLogListResult {
  logs: AuditLog[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ─── Action config ────────────────────────────────────────────────────────────

interface ActionConfig {
  label: string;
  color: string;
  bg: string;
  dot: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const ACTION_CONFIG: Record<string, ActionConfig> = {
  CREATE: {
    label: "CREATE",
    color: "text-success",
    bg: "bg-success-light",
    dot: "bg-success",
    Icon: PlusCircleIcon,
  },
  UPDATE: {
    label: "UPDATE",
    color: "text-brand",
    bg: "bg-brand-light",
    dot: "bg-brand",
    Icon: PencilIcon,
  },
  DELETE: {
    label: "DELETE",
    color: "text-danger",
    bg: "bg-danger-light",
    dot: "bg-danger",
    Icon: Trash2Icon,
  },
  DEACTIVATE: {
    label: "DEACTIVATE",
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    dot: "bg-amber-500",
    Icon: BanIcon,
  },
  FEE_COLLECT: {
    label: "FEE COLLECT",
    color: "text-success",
    bg: "bg-success-light",
    dot: "bg-success",
    Icon: IndianRupeeIcon,
  },
  PROCESS_SALARY: {
    label: "SALARY",
    color: "text-rose-700 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    dot: "bg-rose-500",
    Icon: WalletIcon,
  },
  CREATE_ACCOUNT: {
    label: "ACCOUNT CREATE",
    color: "text-success",
    bg: "bg-success-light",
    dot: "bg-success",
    Icon: PlusCircleIcon,
  },
  UPDATE_ACCOUNT: {
    label: "ACCOUNT UPDATE",
    color: "text-brand",
    bg: "bg-brand-light",
    dot: "bg-brand",
    Icon: PencilIcon,
  },
  DELETE_ACCOUNT: {
    label: "ACCOUNT DELETE",
    color: "text-danger",
    bg: "bg-danger-light",
    dot: "bg-danger",
    Icon: Trash2Icon,
  },
  ADJUST_ACCOUNT: {
    label: "ADJUST",
    color: "text-violet-700 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    dot: "bg-violet-500",
    Icon: SlidersHorizontalIcon,
  },
  INVENTORY_IN: {
    label: "STOCK IN",
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    dot: "bg-emerald-500",
    Icon: ArrowDownIcon,
  },
  INVENTORY_OUT: {
    label: "STOCK OUT",
    color: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/40",
    dot: "bg-orange-500",
    Icon: ArrowUpIcon,
  },
};

const DEFAULT_ACTION_CONFIG: ActionConfig = {
  label: "ACTION",
  color: "text-text-secondary",
  bg: "bg-muted",
  dot: "bg-text-tertiary",
  Icon: ActivityIcon,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatEntityLabel(entity: string): string {
  return entity
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ─── Expandable details ───────────────────────────────────────────────────────

function DetailsModal({ log, open, onOpenChange }: { log: AuditLog; open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Audit Details — {formatEntityLabel(log.entity)} {log.action}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-2 space-y-1 text-sm">
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
            <span className="font-medium text-text-secondary">Entity ID</span>
            <span className="font-mono text-xs text-text-primary break-all">{log.entity_id}</span>
            <span className="font-medium text-text-secondary">Timestamp</span>
            <span className="text-text-primary">{formatDateTime(log.created_at)}</span>
          </div>
          <div className="mt-3 rounded-lg bg-surface-secondary border border-border-light p-3">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Details</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              {Object.entries(log.details ?? {}).map(([key, value]) => (
                <React.Fragment key={key}>
                  <dt className="text-xs font-medium text-text-secondary whitespace-nowrap">{key}</dt>
                  <dd className="text-xs text-text-primary break-all">
                    {value === null || value === undefined ? (
                      <span className="italic text-text-tertiary">-</span>
                    ) : typeof value === "object" ? (
                      <code className="bg-surface-tertiary px-1 py-0.5 rounded">{JSON.stringify(value)}</code>
                    ) : (
                      String(value)
                    )}
                  </dd>
                </React.Fragment>
              ))}
            </dl>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Timeline entry card ──────────────────────────────────────────────────────

interface TimelineEntryProps {
  log: AuditLog;
  index: number;
  isLast: boolean;
}

function TimelineEntry({ log, index, isLast }: TimelineEntryProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);

  const config = ACTION_CONFIG[log.action] ?? DEFAULT_ACTION_CONFIG;
  const Icon = config.Icon;
  const hasDetails = log.details && Object.keys(log.details).length > 0;
  const detailEntries = hasDetails ? Object.entries(log.details ?? {}) : [];

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex gap-4"
    >
      {/* Timeline spine */}
      <div className="flex flex-col items-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: index * 0.04 + 0.1 }}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.bg} ring-2 ring-white shadow-sm`}
        >
          <Icon className={`h-4 w-4 ${config.color}`} />
        </motion.div>
        {!isLast && (
          <div className="w-px flex-1 bg-border-light mt-1 min-h-[16px]" />
        )}
      </div>

      {/* Card */}
      <div className="pb-4 flex-1 min-w-0">
        <motion.div
          whileHover={{ y: -1, boxShadow: "0 4px 20px -4px rgba(0,0,0,0.08)", transition: { duration: 0.2 } }}
          className="rounded-xl border border-border-light bg-surface p-4 flex flex-col gap-3"
        >
          {/* Top row */}
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${config.bg} ${config.color}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                {config.label}
              </span>
              <span className="text-sm font-medium text-text-primary">
                {formatEntityLabel(log.entity)}
              </span>
            </div>
            <span className="text-xs text-text-tertiary whitespace-nowrap">
              {formatDateTime(log.created_at)}
            </span>
          </div>

          {/* Entity ID */}
          <p className="text-xs font-mono text-text-secondary truncate">
            ID: {log.entity_id}
          </p>

          {/* Details toggle */}
          {hasDetails && (
            <>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className={`flex items-center gap-1.5 self-start text-xs font-medium transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-brand rounded ${config.color} hover:opacity-80`}
              >
                <span>
                  {expanded ? "Hide details" : `Show ${detailEntries.length} detail${detailEntries.length !== 1 ? "s" : ""}`}
                </span>
                <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.25 }}>
                  <ChevronDownIcon className="h-3.5 w-3.5" />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    key="details"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-lg bg-surface-secondary border border-border-light p-3">
                      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                        {detailEntries.slice(0, 6).map(([key, value]) => (
                          <React.Fragment key={key}>
                            <dt className="text-xs font-medium text-text-secondary whitespace-nowrap">{key}</dt>
                            <dd className="text-xs text-text-primary break-all">
                              {value === null || value === undefined
                                ? <span className="italic text-text-tertiary">-</span>
                                : typeof value === "object"
                                ? <code className="bg-surface-tertiary px-1 py-0.5 rounded">{JSON.stringify(value)}</code>
                                : String(value)}
                            </dd>
                          </React.Fragment>
                        ))}
                      </dl>
                      {detailEntries.length > 6 && (
                        <button
                          type="button"
                          onClick={() => setModalOpen(true)}
                          className={`mt-2 text-xs ${config.color} hover:underline focus:outline-none`}
                        >
                          View all {detailEntries.length} fields
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </motion.div>

        <DetailsModal log={log} open={modalOpen} onOpenChange={setModalOpen} />
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AuditLogList() {
  const [result, setResult] = React.useState<AuditLogListResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const [entityFilter, setEntityFilter] = React.useState<string>("");
  const [actionFilter, setActionFilter] = React.useState<string>("");
  const [dateFrom, setDateFrom] = React.useState<string>("");
  const [dateTo, setDateTo] = React.useState<string>("");
  const [page, setPage] = React.useState(1);

  const fetchLogs = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (entityFilter) params.set("entity", entityFilter);
      if (actionFilter) params.set("action", actionFilter);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      params.set("page", String(page));
      params.set("per_page", "25");

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to load audit logs");
      }
      setResult((await res.json()) as AuditLogListResult);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load audit logs");
    } finally {
      setIsLoading(false);
    }
  }, [entityFilter, actionFilter, dateFrom, dateTo, page]);

  React.useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  React.useEffect(() => {
    setPage(1);
  }, [entityFilter, actionFilter, dateFrom, dateTo]);

  function clearFilters() {
    setEntityFilter("");
    setActionFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  const hasFilters = entityFilter || actionFilter || dateFrom || dateTo;

  return (
    <PageTransition>
      <div className="flex flex-col gap-4">
        {/* Filter toolbar — frosted */}
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border-light bg-surface/80 backdrop-blur-sm p-4 shadow-sm">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-secondary">Entity</label>
            <Select value={entityFilter} onValueChange={(val) => setEntityFilter(val == null || val === "__all__" ? "" : val)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Entities" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Entities</SelectItem>
                {AUDIT_ENTITY_VALUES.map((e) => (
                  <SelectItem key={e} value={e}>{formatEntityLabel(e)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-secondary">Action</label>
            <Select value={actionFilter} onValueChange={(val) => setActionFilter(val == null || val === "__all__" ? "" : val)}>
              <SelectTrigger className="w-[170px]">
                <span>
                  {actionFilter
                    ? (ACTION_CONFIG[actionFilter]?.label ?? actionFilter)
                    : "All Actions"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Actions</SelectItem>
                {AUDIT_ACTION_VALUES.map((a) => (
                  <SelectItem key={a} value={a}>
                    {ACTION_CONFIG[a]?.label ?? a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-secondary">From</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[148px]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-secondary">To</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[148px]"
            />
          </div>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="self-end mb-0.5">
              <FilterXIcon className="h-4 w-4 mr-1" />
              Clear filters
            </Button>
          )}
        </div>

        {/* Export + summary row */}
        <div className="flex items-center justify-between">
          {result ? (
            <p className="text-sm text-text-secondary">
              {result.total === 0
                ? "No audit log entries found"
                : `Showing ${(result.page - 1) * result.per_page + 1}–${Math.min(result.page * result.per_page, result.total)} of ${result.total} entr${result.total !== 1 ? "ies" : "y"}`}
            </p>
          ) : (
            <span />
          )}
          <ExportButton
            data={(result?.logs ?? []).map((log) => ({
              created_at: formatDateTime(log.created_at),
              action: log.action,
              entity: formatEntityLabel(log.entity),
              entity_id: log.entity_id,
              details: log.details ? JSON.stringify(log.details) : "",
            }))}
            columns={[
              { key: "created_at", label: "Date / Time" },
              { key: "action", label: "Action" },
              { key: "entity", label: "Entity" },
              { key: "entity_id", label: "Entity ID" },
              { key: "details", label: "Details" },
            ]}
            filename="audit-log"
            disabled={isLoading || !result?.logs.length}
          />
        </div>

        {/* Timeline */}
        {isLoading ? (
          <div className="flex flex-col gap-4 pl-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 rounded-xl border border-border-light bg-surface p-4 flex flex-col gap-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-64" />
                </div>
              </div>
            ))}
          </div>
        ) : result?.logs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border bg-surface p-12 text-center text-sm text-text-secondary"
          >
            {hasFilters
              ? "No audit log entries match the current filters."
              : "No audit log entries recorded yet."}
          </motion.div>
        ) : (
          <div className="pl-0">
            {result?.logs.map((log, i) => (
              <TimelineEntry
                key={log.id}
                log={log}
                index={i}
                isLast={i === (result.logs.length - 1)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {result && result.total_pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-secondary">Page {result.page} of {result.total_pages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= result.total_pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
