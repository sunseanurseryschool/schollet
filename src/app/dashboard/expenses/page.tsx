import { DashboardHeader } from "@/components/dashboard-header";
import { ExpenseList } from "@/components/expenses/expense-list";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Expenses | Schollet",
};

export default function ExpensesPage() {
  return (
    <>
      <DashboardHeader title="Expenses" />
      <div className="p-6">
        <ExpenseList />
      </div>
    </>
  );
}
