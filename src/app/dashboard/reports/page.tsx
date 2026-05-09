import { DashboardHeader } from "@/components/dashboard-header";
import { ReportsView } from "@/components/reports/reports-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reports & Analytics | Schollet",
};

export default function ReportsPage() {
  return (
    <>
      <DashboardHeader title="Reports & Analytics" />
      <div className="p-6">
        <ReportsView />
      </div>
    </>
  );
}
