import { DashboardHeader } from "@/components/dashboard-header";
import { PayrollView } from "@/components/payroll/payroll-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Payroll | Schollet",
};

export default function PayrollPage() {
  return (
    <>
      <DashboardHeader title="Payroll" />
      <div className="p-6">
        <PayrollView />
      </div>
    </>
  );
}
