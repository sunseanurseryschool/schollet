import { DashboardHeader } from "@/components/dashboard-header";
import { AccountsView } from "@/components/accounts/accounts-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Accounts | Schollet",
};

export default function AccountsPage() {
  return (
    <>
      <DashboardHeader title="Accounts" />
      <div className="p-6">
        <AccountsView />
      </div>
    </>
  );
}
