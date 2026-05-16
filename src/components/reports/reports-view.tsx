"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/ui/animated";
import { PremiumTabs } from "./shared/premium-tabs";
import { tabContentVariants } from "./shared/constants";
import { IncomeExpenseTab } from "./tabs/income-expense-tab";
import { StudentDuesTab } from "./tabs/student-dues-tab";
import { CollectionTab } from "./tabs/collection-tab";
import { DiscountTab } from "./tabs/discount-tab";
import { ExpenseReportTab } from "./tabs/expense-report-tab";
import { SalaryReportTab } from "./tabs/salary-report-tab";
import { InventoryReportTab } from "./tabs/inventory-report-tab";

const REPORT_TABS = [
  { value: "income-expense", label: "Income vs Expense" },
  { value: "student-dues", label: "Student Dues" },
  { value: "collection", label: "Collection" },
  { value: "discounts", label: "Discounts" },
  { value: "expenses", label: "Expenses" },
  { value: "salary", label: "Salary" },
  { value: "inventory", label: "Inventory" },
] as const;

type ReportTab = (typeof REPORT_TABS)[number]["value"];

export function ReportsView() {
  const [activeTab, setActiveTab] = React.useState<ReportTab>("income-expense");

  return (
    <PageTransition>
      <div className="flex flex-col gap-5">
        <PremiumTabs
          tabs={REPORT_TABS}
          activeTab={activeTab}
          onTabChange={(v) => setActiveTab(v as ReportTab)}
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={tabContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {activeTab === "income-expense" && <IncomeExpenseTab />}
            {activeTab === "student-dues" && <StudentDuesTab />}
            {activeTab === "collection" && <CollectionTab />}
            {activeTab === "discounts" && <DiscountTab />}
            {activeTab === "expenses" && <ExpenseReportTab />}
            {activeTab === "salary" && <SalaryReportTab />}
            {activeTab === "inventory" && <InventoryReportTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
