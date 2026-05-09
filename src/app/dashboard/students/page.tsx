import { DashboardHeader } from "@/components/dashboard-header";
import { StudentList } from "@/components/students/student-list";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Students | Schollet",
};

export default function StudentsPage() {
  return (
    <>
      <DashboardHeader title="Students" />
      <div className="p-6">
        <StudentList />
      </div>
    </>
  );
}
