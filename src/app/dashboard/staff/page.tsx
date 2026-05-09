import { DashboardHeader } from "@/components/dashboard-header";
import { StaffList } from "@/components/staff/staff-list";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Staff | Schollet",
};

export default function StaffPage() {
  return (
    <>
      <DashboardHeader title="Staff" />
      <div className="p-6">
        <StaffList />
      </div>
    </>
  );
}
