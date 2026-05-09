import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getDashboardStats } from "@/services/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const result = await getDashboardStats();

  // Graceful fallback on error — show zeros rather than crash
  const stats = result.data ?? {
    todayCollection: 0,
    totalActiveStudents: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    pendingDues: 0,
    recentTransactions: [],
  };

  return (
    <>
      <DashboardHeader title="Dashboard" />
      <DashboardView stats={stats} />
    </>
  );
}
