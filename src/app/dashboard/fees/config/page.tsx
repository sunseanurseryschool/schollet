import { DashboardHeader } from "@/components/dashboard-header";
import { FeeConfigList } from "@/components/fee-configs/fee-config-list";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Fee Configuration | Schollet",
};

export default function FeeConfigPage() {
  return (
    <>
      <DashboardHeader title="Fee Configuration" />
      <div className="p-6">
        <FeeConfigList />
      </div>
    </>
  );
}
