import { DashboardHeader } from "@/components/dashboard-header";
import { InventoryList } from "@/components/inventory/inventory-list";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Inventory | Schollet",
};

export default function InventoryPage() {
  return (
    <>
      <DashboardHeader title="Inventory" />
      <div className="p-6">
        <InventoryList />
      </div>
    </>
  );
}
