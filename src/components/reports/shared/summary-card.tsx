"use client";

import { AnimatedCard, AnimatedCounter } from "@/components/ui/animated";

export interface SummaryCardProps {
  label: string;
  value: string;
  variant?: "default" | "positive" | "negative" | "neutral";
  delay?: number;
}

export function SummaryCard({
  label,
  value,
  variant = "default",
  delay = 0,
}: SummaryCardProps) {
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
