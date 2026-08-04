"use client";

import { formatINR } from "@/lib/format";
import { todayParts } from "@/lib/dates";
import * as React from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  AnimatedCard,
  StaggerContainer,
  StaggerItem,
} from "@/components/ui/animated";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { IncomeExpenseResult } from "@/services/reports";
import { DateRangeFilter } from "../shared/date-range-filter";
import { SummaryCard } from "../shared/summary-card";
import { compactINR, currentMonthRange } from "../shared/helpers";

interface MonthlyTrendPoint {
  month: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

// ─── Trend range presets ──────────────────────────────────────────────────────

type TrendPreset =
  | "last-3-months"
  | "last-6-months"
  | "this-month"
  | "last-month"
  | "this-year"
  | "last-year";

const TREND_PRESETS: ReadonlyArray<{ value: TrendPreset; label: string }> = [
  { value: "last-3-months", label: "Last 3 months" },
  { value: "last-6-months", label: "Last 6 months" },
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "this-year", label: "This year" },
  { value: "last-year", label: "Last year" },
];

const TREND_LABEL: Record<TrendPreset, string> = Object.fromEntries(
  TREND_PRESETS.map((p) => [p.value, p.label]),
) as Record<TrendPreset, string>;

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function rangeForPreset(preset: TrendPreset): { from: string; to: string } {
  // Anchor to the school's calendar date, not the device clock.
  const { year: y, month } = todayParts();
  const m = month - 1;
  switch (preset) {
    case "last-3-months": {
      const start = new Date(y, m - 2, 1);
      const end = new Date(y, m + 1, 0);
      return { from: isoDate(start), to: isoDate(end) };
    }
    case "last-6-months": {
      const start = new Date(y, m - 5, 1);
      const end = new Date(y, m + 1, 0);
      return { from: isoDate(start), to: isoDate(end) };
    }
    case "this-month": {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      return { from: isoDate(start), to: isoDate(end) };
    }
    case "last-month": {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      return { from: isoDate(start), to: isoDate(end) };
    }
    case "this-year": {
      const start = new Date(y, 0, 1);
      const end = new Date(y, m + 1, 0);
      return { from: isoDate(start), to: isoDate(end) };
    }
    case "last-year": {
      const start = new Date(y - 1, 0, 1);
      const end = new Date(y - 1, 11, 31);
      return { from: isoDate(start), to: isoDate(end) };
    }
  }
}

export function IncomeExpenseTab() {
  const defaultRange = currentMonthRange();
  const [dateFrom, setDateFrom] = React.useState(defaultRange.from);
  const [dateTo, setDateTo] = React.useState(defaultRange.to);
  const [data, setData] = React.useState<IncomeExpenseResult | null>(null);
  const [trendData, setTrendData] = React.useState<MonthlyTrendPoint[] | null>(
    null,
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [isTrendLoading, setIsTrendLoading] = React.useState(true);
  const [trendPreset, setTrendPreset] =
    React.useState<TrendPreset>("last-6-months");

  // Trend uses its own date range driven by the preset dropdown.
  React.useEffect(() => {
    void (async () => {
      setIsTrendLoading(true);
      try {
        const { from, to } = rangeForPreset(trendPreset);
        const params = new URLSearchParams({ date_from: from, date_to: to });
        const res = await fetch(
          `/api/reports/monthly-trend?${params.toString()}`,
        );
        if (res.ok) {
          setTrendData((await res.json()) as MonthlyTrendPoint[]);
        }
      } catch {
        // silent — chart just stays empty
      } finally {
        setIsTrendLoading(false);
      }
    })();
  }, [trendPreset]);

  const fetchData = React.useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
      });
      const ieRes = await fetch(
        `/api/reports/income-expense?${params.toString()}`,
      );
      if (!ieRes.ok) {
        const b = (await ieRes.json()) as { error?: string };
        throw new Error(b.error ?? "Failed to load income/expense data");
      }
      setData((await ieRes.json()) as IncomeExpenseResult);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo]);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Profit margin (% of income) — capped to ±999 to avoid silly displays.
  const margin = React.useMemo(() => {
    if (!data || data.total_income === 0) return null;
    const raw = (data.net / data.total_income) * 100;
    return Math.max(-999, Math.min(999, Math.round(raw)));
  }, [data]);

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
            <SummaryCard
              label="Total Income"
              value={formatINR(data.total_income)}
              variant="positive"
            />
          </StaggerItem>
          <StaggerItem>
            <SummaryCard
              label="Total Expense"
              value={formatINR(data.total_expense)}
              variant="negative"
            />
          </StaggerItem>
          <StaggerItem>
            <SummaryCard
              label={
                margin === null
                  ? "Net"
                  : `Net — ${margin >= 0 ? "+" : ""}${margin}% margin`
              }
              value={formatINR(data.net)}
              variant={data.net >= 0 ? "positive" : "negative"}
            />
          </StaggerItem>
        </StaggerContainer>
      ) : null}

      {/* ── Monthly trend chart (last 6 months) ──────────────────────── */}
      <AnimatedCard
        className="rounded-xl ring-1 ring-foreground/10 bg-surface overflow-hidden"
        hover={false}
      >
        <div className="px-5 py-3 border-b border-border-light flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              {TREND_LABEL[trendPreset]}
            </h3>
            <p className="text-xs text-text-secondary">
              Income vs expense, by month.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {trendData && trendData.length > 1 && (
              <TrendDelta points={trendData} />
            )}
            <Select
              value={trendPreset}
              onValueChange={(val) => {
                if (val != null) setTrendPreset(val as TrendPreset);
              }}
            >
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <span>{TREND_LABEL[trendPreset]}</span>
              </SelectTrigger>
              <SelectContent>
                {TREND_PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="h-56 px-2 py-3">
          {isTrendLoading ? (
            <Skeleton className="h-full w-full rounded-lg" />
          ) : trendData && trendData.length > 0 ? (
            <ResponsiveContainer
              width="100%"
              height="100%"
              minHeight={1}
              minWidth={1}
            >
              <AreaChart
                data={trendData}
                margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="incomeGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient
                    id="expenseGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#EF4444" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border-light, #e5e7eb)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{
                    fontSize: 11,
                    fill: "var(--color-text-secondary, #64748b)",
                  }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => compactINR(v)}
                  tick={{
                    fontSize: 11,
                    fill: "var(--color-text-secondary, #64748b)",
                  }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                />
                <Tooltip
                  cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
                  content={<TrendTooltip />}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="#10B981"
                  fill="url(#incomeGradient)"
                  strokeWidth={2}
                  activeDot={{ r: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="Expense"
                  stroke="#EF4444"
                  fill="url(#expenseGradient)"
                  strokeWidth={2}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-text-secondary">
              No activity in the last 6 months.
            </div>
          )}
        </div>
      </AnimatedCard>
    </div>
  );
}

// ─── Chart helpers (private to this tab) ──────────────────────────────────────

function TrendDelta({ points }: { points: MonthlyTrendPoint[] }) {
  if (points.length < 2) return null;
  const last = points[points.length - 1].net;
  const prev = points[points.length - 2].net;
  const delta = last - prev;
  const sign = delta > 0 ? "↗" : delta < 0 ? "↘" : "→";
  const color =
    delta > 0
      ? "text-success"
      : delta < 0
        ? "text-danger"
        : "text-text-secondary";
  return (
    <p className={`text-xs font-semibold ${color}`}>
      Net trend {sign} {formatINR(Math.abs(delta))} vs last month
    </p>
  );
}

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
  payload: MonthlyTrendPoint;
}

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-border-light bg-surface px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-text-primary mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-success" />
        <span className="text-text-secondary">Income</span>
        <span className="ml-auto font-semibold text-text-primary tabular-nums">
          {formatINR(point.income)}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="inline-block h-2 w-2 rounded-full bg-danger" />
        <span className="text-text-secondary">Expense</span>
        <span className="ml-auto font-semibold text-text-primary tabular-nums">
          {formatINR(point.expense)}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-1 pt-1 border-t border-border-light">
        <span className="text-text-secondary">Net</span>
        <span
          className={`ml-auto font-bold tabular-nums ${point.net >= 0 ? "text-success" : "text-danger"}`}
        >
          {formatINR(point.net)}
        </span>
      </div>
    </div>
  );
}
