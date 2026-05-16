"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ExportButton } from "@/components/export-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AnimatedCard,
  StaggerContainer,
  StaggerItem,
  tableRowVariants,
} from "@/components/ui/animated";
import type { InventoryReportRow } from "@/services/reports";
import { SummaryCard } from "../shared/summary-card";
import { TableSkeletonRows } from "../shared/table-skeleton-rows";

export function InventoryReportTab() {
  const [data, setData] = React.useState<InventoryReportRow[] | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/reports/inventory");
      if (!res.ok) {
        const b = (await res.json()) as { error?: string };
        throw new Error(b.error ?? "Failed to load inventory report");
      }
      setData((await res.json()) as InventoryReportRow[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const lowStockCount = data?.filter((r) => r.is_low_stock).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : data ? (
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StaggerItem>
            <SummaryCard
              label="Total Items"
              value={String(data.length)}
              variant="neutral"
            />
          </StaggerItem>
          <StaggerItem>
            <SummaryCard
              label="Low Stock Items"
              value={String(lowStockCount)}
              variant={lowStockCount > 0 ? "negative" : "positive"}
            />
          </StaggerItem>
        </StaggerContainer>
      ) : null}

      <AnimatedCard
        className="rounded-xl ring-1 ring-foreground/10 bg-surface overflow-hidden"
        hover={false}
      >
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <span className="text-sm font-semibold text-text-primary">
            Inventory Report
          </span>
          <ExportButton
            data={(data ?? []).map((row) => ({
              ...row,
              status: row.is_low_stock ? "Low Stock" : "OK",
            }))}
            columns={[
              { key: "name", label: "Item Name" },
              { key: "unit", label: "Unit" },
              { key: "quantity", label: "In Stock" },
              { key: "min_quantity", label: "Min. Stock" },
              { key: "total_in", label: "Total IN" },
              { key: "total_out", label: "Total OUT" },
              { key: "status", label: "Status" },
            ]}
            filename="inventory-report"
            disabled={isLoading || !data?.length}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">In Stock</TableHead>
              <TableHead className="text-right">Min. Stock</TableHead>
              <TableHead className="text-right">Total IN</TableHead>
              <TableHead className="text-right">Total OUT</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows cols={7} />
            ) : data?.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-text-secondary text-sm"
                >
                  No inventory items found.
                </TableCell>
              </TableRow>
            ) : (
              data?.map((row: InventoryReportRow, i: number) => (
                <motion.tr
                  key={row.id}
                  custom={i}
                  variants={tableRowVariants}
                  initial="hidden"
                  animate="visible"
                  className={`border-b transition-colors hover:bg-muted/50 ${row.is_low_stock ? "bg-red-50/40" : ""}`}
                >
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-sm text-text-secondary">
                    {row.unit}
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold ${row.is_low_stock ? "text-danger" : "text-text-primary"}`}
                  >
                    {row.quantity}
                  </TableCell>
                  <TableCell className="text-right text-text-secondary">
                    {row.min_quantity}
                  </TableCell>
                  <TableCell className="text-right text-success">
                    {row.total_in}
                  </TableCell>
                  <TableCell className="text-right text-text-secondary">
                    {row.total_out}
                  </TableCell>
                  <TableCell>
                    {row.is_low_stock ? (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                        Low Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        OK
                      </span>
                    )}
                  </TableCell>
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
      </AnimatedCard>
    </div>
  );
}
