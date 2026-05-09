import { DashboardHeader } from "@/components/dashboard-header";
import { FeeDuesView } from "@/components/fees/fee-dues-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pending Dues | Schollet",
};

export default function FeeDuesPage() {
  return (
    <>
      <DashboardHeader title="Pending Dues" />
      <div className="p-6">
        <FeeDuesView />
      </div>
    </>
  );
}
