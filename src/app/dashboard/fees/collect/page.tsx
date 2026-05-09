import { DashboardHeader } from "@/components/dashboard-header";
import { FeeCollectForm } from "@/components/fees/fee-collect-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Collect Fee | Schollet",
};

export default function FeeCollectPage() {
  return (
    <>
      <DashboardHeader title="Collect Fee" />
      <div className="p-6">
        <FeeCollectForm />
      </div>
    </>
  );
}
