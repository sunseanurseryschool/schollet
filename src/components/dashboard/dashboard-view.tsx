"use client";

import Link from "next/link";
import { motion, type Easing } from "framer-motion";
import {
  IndianRupee,
  Users,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
  Receipt,
  ShoppingCart,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
  AnimatedCard,
  AnimatedCounter,
  SlideIn,
} from "@/components/ui/animated";
import type { DashboardStats, RecentTransaction } from "@/services/dashboard";
import { formatINR } from "@/lib/format";

// ─── Constants ───────────────────────────────────────────────────────────────

const CUBIC_EASE: Easing = [0.25, 0.46, 0.45, 0.94];

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardViewProps {
  stats: DashboardStats;
}

interface StatCardConfig {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  gradient: string;
  iconBg: string;
  delay: number;
}

interface QuickAction {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  textColor: string;
}

// ─── Shimmer overlay (CSS-based, no extra deps) ───────────────────────────────

const shimmerClass =
  "before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:transition-transform hover:before:translate-x-full before:duration-700 overflow-hidden relative";

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  gradient,
  iconBg,
  delay,
}: StatCardConfig) {
  return (
    <AnimatedCard delay={delay} className="h-full">
      <div
        className={`rounded-xl border border-surface/60 p-5 h-full ${gradient} ${shimmerClass} shadow-sm`}
      >
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            {title}
          </p>
          <div
            className={`flex items-center justify-center w-9 h-9 rounded-full ${iconBg}`}
          >
            {icon}
          </div>
        </div>

        {/* Value */}
        <div className="flex items-end gap-1.5 mb-1">
          <AnimatedCounter
            value={value}
            className="text-2xl font-bold text-text-primary leading-none"
          />
          {trend === "up" && (
            <ArrowUpRight className="h-4 w-4 text-success mb-0.5 shrink-0" />
          )}
          {trend === "down" && (
            <ArrowDownRight className="h-4 w-4 text-danger mb-0.5 shrink-0" />
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-text-secondary">{description}</p>
      </div>
    </AnimatedCard>
  );
}

// ─── Net Profit / Loss Card ───────────────────────────────────────────────────

function NetIndicatorCard({
  income,
  expense,
}: {
  income: number;
  expense: number;
}) {
  const net = income - expense;
  const isProfit = net >= 0;

  return (
    <AnimatedCard delay={0.36} hover={false} className="w-full">
      <motion.div
        className={`rounded-xl border p-6 ${shimmerClass} ${
          isProfit
            ? "bg-gradient-to-r from-[#F0FDF4] via-[#DCFCE7] to-[#F0FDF4] border-[#86EFAC] dark:from-[#052e16] dark:via-[#14532d] dark:to-[#052e16] dark:border-[#166534]"
            : "bg-gradient-to-r from-[#FEF2F2] via-[#FEE2E2] to-[#FEF2F2] border-[#FCA5A5] dark:from-[#450a0a] dark:via-[#7f1d1d] dark:to-[#450a0a] dark:border-[#991b1b]"
        }`}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 0.5,
          delay: 0.36,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left: label + big number */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-2">
              Monthly Net {isProfit ? "Profit" : "Loss"}
            </p>
            <div className="flex items-center gap-2">
              <motion.div
                initial={{ rotate: isProfit ? -20 : 20, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.55, ease: "backOut" }}
              >
                {isProfit ? (
                  <TrendingUp
                    className="h-7 w-7 text-success"
                    strokeWidth={2.5}
                  />
                ) : (
                  <TrendingDown
                    className="h-7 w-7 text-danger"
                    strokeWidth={2.5}
                  />
                )}
              </motion.div>
              <motion.span
                className={`text-3xl font-extrabold tracking-tight ${
                  isProfit ? "text-success" : "text-danger"
                }`}
                initial={{ opacity: 0, scale: 0.8, filter: "blur(6px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                transition={{
                  duration: 0.55,
                  delay: 0.48,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
              >
                {formatINR(Math.abs(net))}
              </motion.span>
            </div>
          </div>

          {/* Right: income vs expense breakdown */}
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-xs text-text-secondary font-medium mb-0.5">
                Income
              </p>
              <p className="text-base font-bold text-success">
                {formatINR(income)}
              </p>
            </div>
            <div className="w-px bg-current opacity-10" />
            <div className="text-center">
              <p className="text-xs text-text-secondary font-medium mb-0.5">
                Expenses
              </p>
              <p className="text-base font-bold text-danger">
                {formatINR(expense)}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatedCard>
  );
}

// ─── Transaction avatar ───────────────────────────────────────────────────────

function TxAvatar({ name }: { name: string }) {
  const letter = name.trim().charAt(0).toUpperCase() || "?";
  // Derive a deterministic hue from the name for variety
  const hue =
    name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360;

  return (
    <div
      className="flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-bold shrink-0"
      style={{ backgroundColor: `hsl(${hue}, 55%, 48%)` }}
    >
      {letter}
    </div>
  );
}

// ─── Recent Transactions ──────────────────────────────────────────────────────

function RecentTransactionsCard({
  transactions,
}: {
  transactions: RecentTransaction[];
}) {
  return (
    <SlideIn direction="left" delay={0.44}>
      <Card className="h-full border-border-light shadow-sm">
        <CardHeader className="pb-3 border-b border-border-light">
          <CardTitle className="text-base font-semibold text-text-primary">
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {transactions.length === 0 ? (
            <p className="text-sm text-text-secondary py-4 text-center">
              No transactions recorded yet.
            </p>
          ) : (
            <motion.ul
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.07 } },
              }}
              className="divide-y divide-border-light"
            >
              {transactions.map((tx, i) => (
                <motion.li
                  key={tx.id}
                  custom={i}
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: {
                      opacity: 1,
                      x: 0,
                      transition: {
                        duration: 0.35,
                        delay: i * 0.07,
                        ease: CUBIC_EASE,
                      },
                    },
                  }}
                  whileHover={{
                    x: 4,
                    backgroundColor: "rgba(219,234,254,0.35)",
                    transition: { duration: 0.15 },
                  }}
                  className="flex items-center gap-3 py-3 first:pt-1 last:pb-1 rounded-lg px-2 -mx-2 border-l-2 border-transparent group cursor-default"
                  style={{ borderLeftColor: "transparent" }}
                  onHoverStart={(e) => {
                    (e.target as HTMLElement)
                      ?.closest("li")
                      ?.style.setProperty("border-left-color", "#2563EB");
                  }}
                  onHoverEnd={(e) => {
                    (e.target as HTMLElement)
                      ?.closest("li")
                      ?.style.setProperty("border-left-color", "transparent");
                  }}
                >
                  <TxAvatar name={tx.student_name} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {tx.student_name}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {tx.receipt_no} &middot; {tx.payment_date}
                    </p>
                  </div>
                  <span className="ml-2 text-sm font-bold text-success whitespace-nowrap bg-success-light px-2 py-0.5 rounded-md">
                    {formatINR(tx.paid_amount)}
                  </span>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </CardContent>
      </Card>
    </SlideIn>
  );
}

// ─── Quick Actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Add Student",
    description: "Enroll a new student",
    href: "/dashboard/students",
    icon: <UserPlus className="h-5 w-5" />,
    iconBg: "bg-brand-light text-brand",
    textColor: "text-brand",
  },
  {
    label: "Collect Fee",
    description: "Record a payment",
    href: "/dashboard/fees/collect",
    icon: <Receipt className="h-5 w-5" />,
    iconBg: "bg-success-light text-success",
    textColor: "text-success",
  },
  {
    label: "Add Expense",
    description: "Log an expense",
    href: "/dashboard/expenses",
    icon: <ShoppingCart className="h-5 w-5" />,
    iconBg: "bg-danger-light text-danger",
    textColor: "text-danger",
  },
  {
    label: "View Reports",
    description: "Financial summaries",
    href: "/dashboard/reports",
    icon: <BarChart3 className="h-5 w-5" />,
    iconBg: "bg-warning-light text-warning",
    textColor: "text-warning",
  },
];

function QuickActionsCard() {
  return (
    <SlideIn direction="right" delay={0.44}>
      <Card className="h-full border-border-light shadow-sm">
        <CardHeader className="pb-3 border-b border-border-light">
          <CardTitle className="text-base font-semibold text-text-primary">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StaggerContainer className="grid grid-cols-2 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <StaggerItem key={action.href}>
                <motion.div
                  whileHover={{
                    y: -3,
                    boxShadow:
                      "0 8px 24px -6px rgba(0,0,0,0.10), 0 2px 8px -2px rgba(0,0,0,0.06)",
                    transition: { duration: 0.18, ease: "easeOut" },
                  }}
                  whileTap={{ scale: 0.97 }}
                  className="rounded-xl"
                >
                  <Button
                    variant="outline"
                    className="w-full h-auto flex-col items-start gap-2 p-4 border-border-light bg-surface hover:bg-surface-secondary hover:border-[#CBD5E1] transition-colors rounded-xl"
                    render={<Link href={action.href} />}
                  >
                    <div
                      className={`flex items-center justify-center w-9 h-9 rounded-lg ${action.iconBg}`}
                    >
                      {action.icon}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-text-primary leading-tight">
                        {action.label}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5 leading-tight">
                        {action.description}
                      </p>
                    </div>
                  </Button>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </CardContent>
      </Card>
    </SlideIn>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function DashboardView({ stats }: DashboardViewProps) {
  const statCards: StatCardConfig[] = [
    {
      title: "Today's Collection",
      value: formatINR(stats.todayCollection),
      description: "Fee payments received today",
      icon: <IndianRupee className="h-4 w-4 text-success" />,
      trend: "neutral",
      gradient: "bg-gradient-to-br from-surface to-[#F0FDF4] dark:to-[#052e16]",
      iconBg: "bg-success-light",
      delay: 0,
    },
    {
      title: "Active Students",
      value: String(stats.totalActiveStudents),
      description: "Currently enrolled students",
      icon: <Users className="h-4 w-4 text-brand" />,
      trend: "neutral",
      gradient: "bg-gradient-to-br from-surface to-[#EFF6FF] dark:to-[#1e3a5f]",
      iconBg: "bg-brand-light",
      delay: 0.08,
    },
    {
      title: "Monthly Income",
      value: formatINR(stats.monthlyIncome),
      description: "This month's total income",
      icon: <TrendingUp className="h-4 w-4 text-success" />,
      trend: "up",
      gradient: "bg-gradient-to-br from-surface to-[#F0FDF4] dark:to-[#052e16]",
      iconBg: "bg-success-light",
      delay: 0.16,
    },
    {
      title: "Monthly Expense",
      value: formatINR(stats.monthlyExpense),
      description: "This month's total expenses",
      icon: <TrendingDown className="h-4 w-4 text-danger" />,
      trend: "down",
      gradient: "bg-gradient-to-br from-surface to-[#FEF2F2] dark:to-[#450a0a]",
      iconBg: "bg-danger-light",
      delay: 0.24,
    },
    {
      title: "Pending Dues",
      value: formatINR(stats.pendingDues),
      description: "Outstanding fee balance",
      icon: <AlertCircle className="h-4 w-4 text-warning" />,
      trend: "neutral",
      gradient: "bg-gradient-to-br from-surface to-[#FFFBEB] dark:to-[#451a03]",
      iconBg: "bg-warning-light",
      delay: 0.32,
    },
  ];

  return (
    <PageTransition>
      <div className="p-6 space-y-6 bg-surface-secondary min-h-full">
        {/* ── Stat cards ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {statCards.map((card) => (
            <StatCard key={card.title} {...card} />
          ))}
        </div>

        {/* ── Net profit / loss ─────────────────────────────────────────────── */}
        <NetIndicatorCard
          income={stats.monthlyIncome}
          expense={stats.monthlyExpense}
        />

        {/* ── Bottom row ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentTransactionsCard transactions={stats.recentTransactions} />
          <QuickActionsCard />
        </div>
      </div>
    </PageTransition>
  );
}
