import { DashboardHeader } from "@/components/dashboard-header";
import { SettingsView } from "@/components/settings/settings-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings | Schollet",
};

export default function SettingsPage() {
  return (
    <>
      <DashboardHeader title="Settings" />
      <div className="p-6">
        <SettingsView />
      </div>
    </>
  );
}
