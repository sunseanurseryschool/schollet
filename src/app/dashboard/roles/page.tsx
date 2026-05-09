import { DashboardHeader } from "@/components/dashboard-header";
import { RolesPermissionsManager } from "@/components/settings/roles-permissions-manager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Roles | Schollet",
};

export default function SettingsPage() {
  return (
    <>
      <DashboardHeader title="Roles" />
      <div className="p-6">
        <RolesPermissionsManager />
      </div>
    </>
  );
}
