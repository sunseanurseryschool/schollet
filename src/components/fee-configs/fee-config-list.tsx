"use client";

import { formatINR } from "@/lib/format";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  MoreHorizontalIcon,
  ReceiptIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FeeConfigFormDialog } from "@/components/fee-configs/fee-config-form-dialog";
import { PageTransition, tableRowVariants } from "@/components/ui/animated";
import { ACADEMIC_YEARS } from "@/lib/constants";
import type { FeeConfigWithHeads } from "@/services/fee-config";

function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded bg-surface-tertiary ${className ?? ""}`}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)",
        }}
        animate={{ x: ["-100%", "200%"] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

export function FeeConfigList() {
  const [configs, setConfigs] = React.useState<FeeConfigWithHeads[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [yearFilter, setYearFilter] = React.useState<string>("");

  // Dialog state
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingConfig, setEditingConfig] =
    React.useState<FeeConfigWithHeads | null>(null);
  const [deleteTarget, setDeleteTarget] =
    React.useState<FeeConfigWithHeads | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const fetchConfigs = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (yearFilter) params.set("academic_year", yearFilter);

      const res = await fetch(`/api/fee-configs?${params.toString()}`);
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to load fee configurations");
      }
      const data = (await res.json()) as FeeConfigWithHeads[];
      setConfigs(data);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to load fee configurations";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [yearFilter]);

  React.useEffect(() => {
    void fetchConfigs();
  }, [fetchConfigs]);

  function handleAddConfig() {
    setEditingConfig(null);
    setFormOpen(true);
  }

  function handleEditConfig(config: FeeConfigWithHeads) {
    setEditingConfig(config);
    setFormOpen(true);
  }

  function handleDeleteClick(config: FeeConfigWithHeads) {
    setDeleteTarget(config);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/fee-configs/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Delete failed");
      }
      toast.success(
        `Fee config "${deleteTarget.title}" for Grade ${deleteTarget.grade} (${deleteTarget.academic_year}) deleted`,
      );
      setDeleteTarget(null);
      void fetchConfigs();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  function handleFormSuccess() {
    void fetchConfigs();
  }

  return (
    <PageTransition>
      <div className="flex flex-col gap-4">
        {/* Toolbar — frosted glass card */}
        <div
          className="rounded-2xl border border-white/60 bg-surface/70 px-4 py-3 shadow-sm backdrop-blur-md"
          style={{ WebkitBackdropFilter: "blur(12px)" }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={yearFilter}
                onValueChange={(val) =>
                  setYearFilter(val == null || val === "__all__" ? "" : val)
                }
              >
                <SelectTrigger className="w-[160px] transition-all duration-200 focus:ring-2 focus:ring-brand/30 focus:border-brand">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Years</SelectItem>
                  {ACADEMIC_YEARS.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <AnimatePresence>
                {yearFilter && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setYearFilter("")}
                    >
                      Clear filter
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Add Config — gradient button */}
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="shrink-0"
            >
              <Button
                onClick={handleAddConfig}
                style={{
                  background:
                    "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                  boxShadow: "0 4px 14px -3px rgba(37,99,235,0.45)",
                }}
                className="border-0 text-white hover:opacity-90 transition-opacity duration-150"
              >
                <PlusIcon className="h-4 w-4" />
                Add Config
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Summary */}
        <AnimatePresence mode="wait">
          {!isLoading && (
            <motion.p
              key={configs.length}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-sm text-text-secondary"
            >
              {configs.length === 0
                ? "No fee configurations found"
                : `${configs.length} fee configuration${configs.length !== 1 ? "s" : ""} found`}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Table card */}
        <div
          className="rounded-2xl bg-surface overflow-hidden"
          style={{
            boxShadow:
              "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px -4px rgba(0,0,0,0.06)",
          }}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grade</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Academic Year</TableHead>
                <TableHead>Fee Heads</TableHead>
                <TableHead className="text-right">Total Fee</TableHead>
                <TableHead className="w-12 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i} className="border-b border-slate-50">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}>
                        <ShimmerSkeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : configs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <motion.div
                      initial={{ opacity: 0, y: 12, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        duration: 0.4,
                        ease: [0.25, 0.46, 0.45, 0.94],
                      }}
                      className="flex flex-col items-center gap-3"
                    >
                      <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="rounded-full bg-surface-tertiary p-4"
                      >
                        <ReceiptIcon className="h-8 w-8 text-text-secondary" />
                      </motion.div>
                      <p className="text-sm text-text-secondary">
                        {yearFilter
                          ? `No fee configurations for ${yearFilter}.`
                          : 'No fee configurations yet. Click "Add Config" to get started.'}
                      </p>
                    </motion.div>
                  </TableCell>
                </TableRow>
              ) : (
                configs.map((config, index) => (
                  <motion.tr
                    key={config.id}
                    variants={tableRowVariants}
                    initial="hidden"
                    animate="visible"
                    custom={index}
                    className="border-b border-slate-50 transition-colors duration-150 hover:bg-slate-50/80 cursor-default"
                  >
                    <TableCell className="font-medium">
                      {config.grade}
                    </TableCell>
                    <TableCell className="text-text-primary">
                      {config.title}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {config.academic_year}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {config.fee_heads.map((head) => (
                          <span
                            key={head.id}
                            className="text-xs text-text-secondary"
                          >
                            {head.name}: {formatINR(head.amount)}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-text-primary">
                      {formatINR(config.total_fee)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Actions for Grade ${config.grade} config`}
                            />
                          }
                        >
                          <MoreHorizontalIcon className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEditConfig(config)}
                          >
                            <PencilIcon className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDeleteClick(config)}
                          >
                            <Trash2Icon className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Add / Edit Dialog */}
        <FeeConfigFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          config={editingConfig}
          onSuccess={handleFormSuccess}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteTarget != null}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Fee Configuration</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-text-secondary">
              Are you sure you want to delete the fee configuration{" "}
              <span className="font-semibold text-text-primary">
                {deleteTarget?.title} — Grade {deleteTarget?.grade} (
                {deleteTarget?.academic_year})
              </span>
              ? This will also delete all associated fee heads and may affect
              existing fee transactions.
            </p>
            <DialogFooter>
              <Button
                variant="destructive"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
              <Button
                variant="outline"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
