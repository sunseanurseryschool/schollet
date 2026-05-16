"use client";

import { motion } from "framer-motion";

interface PremiumTabsProps {
  tabs: ReadonlyArray<{ readonly value: string; readonly label: string }>;
  activeTab: string;
  onTabChange: (value: string) => void;
}

export function PremiumTabs({ tabs, activeTab, onTabChange }: PremiumTabsProps) {
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
            style={{
              color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
            }}
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
