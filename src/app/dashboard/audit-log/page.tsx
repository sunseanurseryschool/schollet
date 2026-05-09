import { DashboardHeader } from "@/components/dashboard-header";
import { AuditLogList } from "@/components/audit-log/audit-log-list";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Audit Log | Schollet",
};

export default function AuditLogPage() {
  return (
    <>
      <DashboardHeader title="Audit Log" />
      <div className="p-6">
        <AuditLogList />
      </div>
    </>
  );
}
