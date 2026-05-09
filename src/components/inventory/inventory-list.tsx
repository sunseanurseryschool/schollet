"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  MoreHorizontalIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  HistoryIcon,
  AlertTriangleIcon,
  PackageIcon,
  MinusIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  StatusBadge,
  inventoryStockVariant,
} from "@/components/ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
  PulseGlow,
  tableRowVariants,
} from "@/components/ui/animated";
import {
  createInventoryItemSchema,
  createInventoryTransactionSchema,
  type CreateInventoryItemInput,
  type CreateInventoryTransactionInput,
} from "@/lib/schemas/inventory";
import type { InventoryItem, InventoryTransaction } from "@/types/database";

// ─── helpers ────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isLowStock(item: InventoryItem): boolean {
  return item.quantity <= item.min_quantity;
}

function isCritical(item: InventoryItem): boolean {
  return item.quantity === 0;
}

/** Stock progress: 0–100 as a percentage of (quantity / max(min_quantity * 3, 1)) */
function stockPercent(item: InventoryItem): number {
  const cap = Math.max(item.min_quantity * 3, item.quantity, 1);
  return Math.min(100, Math.round((item.quantity / cap) * 100));
}

// ─── Item Form Dialog ────────────────────────────────────────────────────────

interface ItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: InventoryItem | null;
  onSuccess: () => void;
}

function ItemFormDialog({
  open,
  onOpenChange,
  item,
  onSuccess,
}: ItemFormDialogProps) {
  const isEditing = item != null;
  const [isPending, setIsPending] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateInventoryItemInput>({
    resolver: zodResolver(createInventoryItemSchema),
    defaultValues: {
      name: "",
      unit: "pcs",
      min_quantity: 0,
      initial_quantity: 0,
    },
  });

  React.useEffect(() => {
    if (open && item) {
      reset({
        name: item.name,
        unit: item.unit,
        min_quantity: item.min_quantity,
        initial_quantity: item.quantity,
      });
    } else if (open && !item) {
      reset({
        name: "",
        unit: "pcs",
        min_quantity: 0,
        initial_quantity: 0,
      });
    }
  }, [open, item, reset]);

  async function onSubmit(data: CreateInventoryItemInput) {
    setIsPending(true);
    try {
      const url = isEditing ? `/api/inventory/${item!.id}` : "/api/inventory";
      const method = isEditing ? "PUT" : "POST";

      const payload = isEditing
        ? { name: data.name, unit: data.unit, min_quantity: data.min_quantity }
        : data;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = (await response.json()) as { error?: string };
        throw new Error(errorBody.error ?? "Request failed");
      }

      toast.success(
        isEditing ? "Item updated successfully" : "Item added successfully",
      );
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Item" : "Add Inventory Item"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="inv-name">
                Item Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="inv-name"
                placeholder="e.g. A4 Paper Ream"
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="inv-unit">
                Unit <span className="text-destructive">*</span>
              </Label>
              <Input
                id="inv-unit"
                placeholder="e.g. pcs, reams, boxes"
                aria-invalid={!!errors.unit}
                {...register("unit")}
              />
              {errors.unit && (
                <p className="text-xs text-destructive">
                  {errors.unit.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="inv-min-qty">Min Stock Alert</Label>
                <Input
                  id="inv-min-qty"
                  type="number"
                  min={0}
                  step={1}
                  placeholder="0"
                  aria-invalid={!!errors.min_quantity}
                  {...register("min_quantity", { valueAsNumber: true })}
                />
                {errors.min_quantity && (
                  <p className="text-xs text-destructive">
                    {errors.min_quantity.message}
                  </p>
                )}
              </div>

              {!isEditing && (
                <div className="grid gap-1.5">
                  <Label htmlFor="inv-init-qty">Opening Stock</Label>
                  <Input
                    id="inv-init-qty"
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    aria-invalid={!!errors.initial_quantity}
                    {...register("initial_quantity", { valueAsNumber: true })}
                  />
                  {errors.initial_quantity && (
                    <p className="text-xs text-destructive">
                      {errors.initial_quantity.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter showCloseButton>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white shadow-sm border-0 hover:opacity-90"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white"
                  />
                  {isEditing ? "Saving..." : "Adding..."}
                </span>
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Add Item"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Stock Transaction Dialog ─────────────────────────────────────────────────

interface StockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  defaultType: "IN" | "OUT";
  onSuccess: () => void;
}

function StockDialog({
  open,
  onOpenChange,
  item,
  defaultType,
  onSuccess,
}: StockDialogProps) {
  const [isPending, setIsPending] = React.useState(false);
  const [txnType, setTxnType] = React.useState<"IN" | "OUT">(defaultType);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateInventoryTransactionInput>({
    resolver: zodResolver(createInventoryTransactionSchema),
    defaultValues: {
      type: defaultType,
      quantity: 1,
      description: "",
      date: todayIso(),
      is_purchase: false,
      amount: undefined,
    },
  });

  const isPurchase = watch("is_purchase");
  const quantity = watch("quantity");

  React.useEffect(() => {
    if (open) {
      setTxnType(defaultType);
      reset({
        type: defaultType,
        quantity: 1,
        description: "",
        date: todayIso(),
        is_purchase: false,
        amount: undefined,
      });
    }
  }, [open, defaultType, reset]);

  function increment() {
    const next = (typeof quantity === "number" ? quantity : 0) + 1;
    setValue("quantity", next, { shouldValidate: true });
  }

  function decrement() {
    const next = Math.max(1, (typeof quantity === "number" ? quantity : 1) - 1);
    setValue("quantity", next, { shouldValidate: true });
  }

  async function onSubmit(data: CreateInventoryTransactionInput) {
    if (!item) return;
    setIsPending(true);
    try {
      const response = await fetch(`/api/inventory/${item.id}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorBody = (await response.json()) as { error?: string };
        throw new Error(errorBody.error ?? "Transaction failed");
      }

      toast.success(
        data.type === "IN"
          ? `Added ${data.quantity} ${item.unit} to ${item.name}`
          : `Removed ${data.quantity} ${item.unit} from ${item.name}`,
      );
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  }

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Stock Movement — {item.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid gap-4 py-2">
            {/* Type toggle */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.05 }}
              className="grid gap-1.5"
            >
              <Label>Movement Type</Label>
              <div className="flex gap-2">
                <motion.div whileTap={{ scale: 0.96 }}>
                  <Button
                    type="button"
                    variant={txnType === "IN" ? "default" : "outline"}
                    size="sm"
                    className={
                      txnType === "IN"
                        ? "bg-success hover:bg-success/90 text-white"
                        : ""
                    }
                    onClick={() => {
                      setTxnType("IN");
                      setValue("type", "IN", { shouldValidate: true });
                    }}
                  >
                    <ArrowDownIcon className="h-3.5 w-3.5" />
                    Stock IN
                  </Button>
                </motion.div>
                <motion.div whileTap={{ scale: 0.96 }}>
                  <Button
                    type="button"
                    variant={txnType === "OUT" ? "default" : "outline"}
                    size="sm"
                    className={
                      txnType === "OUT"
                        ? "bg-danger hover:bg-danger/90 text-white"
                        : ""
                    }
                    onClick={() => {
                      setTxnType("OUT");
                      setValue("type", "OUT", { shouldValidate: true });
                      setValue("is_purchase", false, { shouldValidate: true });
                    }}
                  >
                    <ArrowUpIcon className="h-3.5 w-3.5" />
                    Stock OUT
                  </Button>
                </motion.div>
              </div>
              <p className="text-xs text-text-secondary">
                Current stock:{" "}
                <span className="font-semibold text-text-primary">
                  {item.quantity} {item.unit}
                </span>
              </p>
            </motion.div>

            {/* Quantity with +/- stepper */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.1 }}
              className="grid gap-1.5"
            >
              <Label htmlFor="txn-qty">
                Quantity <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <motion.div whileTap={{ scale: 0.88 }}>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={decrement}
                    className="shrink-0 rounded-lg"
                    aria-label="Decrease quantity"
                  >
                    <MinusIcon className="h-4 w-4" />
                  </Button>
                </motion.div>
                <Input
                  id="txn-qty"
                  type="number"
                  min={1}
                  step={1}
                  aria-invalid={!!errors.quantity}
                  className="text-center text-lg font-bold tabular-nums"
                  {...register("quantity", { valueAsNumber: true })}
                />
                <motion.div whileTap={{ scale: 0.88 }}>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={increment}
                    className="shrink-0 rounded-lg"
                    aria-label="Increase quantity"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </motion.div>
              </div>
              {errors.quantity && (
                <p className="text-xs text-destructive">
                  {errors.quantity.message}
                </p>
              )}
            </motion.div>

            {/* Date */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.15 }}
              className="grid gap-1.5"
            >
              <Label htmlFor="txn-date">Date</Label>
              <Input
                id="txn-date"
                type="date"
                aria-invalid={!!errors.date}
                {...register("date")}
              />
              {errors.date && (
                <p className="text-xs text-destructive">
                  {errors.date.message}
                </p>
              )}
            </motion.div>

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.2 }}
              className="grid gap-1.5"
            >
              <Label htmlFor="txn-desc">Description</Label>
              <Input
                id="txn-desc"
                placeholder="Optional note"
                aria-invalid={!!errors.description}
                {...register("description")}
              />
              {errors.description && (
                <p className="text-xs text-destructive">
                  {errors.description.message}
                </p>
              )}
            </motion.div>

            {/* Purchase flag */}
            {txnType === "IN" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="grid gap-3"
              >
                <div className="flex items-center gap-2">
                  <input
                    id="txn-is-purchase"
                    type="checkbox"
                    className="h-4 w-4 rounded border border-input"
                    {...register("is_purchase")}
                    onChange={(e) => {
                      setValue("is_purchase", e.target.checked, {
                        shouldValidate: true,
                      });
                      if (!e.target.checked) {
                        setValue("amount", undefined, { shouldValidate: true });
                      }
                    }}
                  />
                  <Label htmlFor="txn-is-purchase" className="font-normal">
                    This is a purchase (creates journal entry)
                  </Label>
                </div>

                <AnimatePresence>
                  {isPurchase && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2 }}
                      className="grid gap-1.5"
                    >
                      <Label htmlFor="txn-amount">
                        Purchase Amount (INR){" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="txn-amount"
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="0.00"
                        aria-invalid={!!errors.amount}
                        {...register("amount", { valueAsNumber: true })}
                      />
                      {errors.amount && (
                        <p className="text-xs text-destructive">
                          {errors.amount.message}
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </div>

          <DialogFooter showCloseButton>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white shadow-sm border-0 hover:opacity-90"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white"
                  />
                  Recording...
                </span>
              ) : (
                "Record Movement"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Transaction History Dialog ───────────────────────────────────────────────

interface HistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
}

function HistoryDialog({ open, onOpenChange, item }: HistoryDialogProps) {
  const [transactions, setTransactions] = React.useState<
    InventoryTransaction[]
  >([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || !item) return;

    setIsLoading(true);
    fetch(`/api/inventory/${item.id}/transactions`)
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          throw new Error(body.error ?? "Failed to load transactions");
        }
        return res.json() as Promise<InventoryTransaction[]>;
      })
      .then((data) => setTransactions(data))
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to load transactions";
        toast.error(message);
      })
      .finally(() => setIsLoading(false));
  }, [open, item]);

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Transaction History — {item.name}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex flex-col gap-2 py-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-secondary">
              No transactions recorded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-slate-50 to-slate-50/60 hover:from-slate-50 hover:to-slate-50/60">
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((txn, index) => (
                  <motion.tr
                    key={txn.id}
                    custom={index}
                    variants={tableRowVariants}
                    initial="hidden"
                    animate="visible"
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="text-text-secondary tabular-nums">
                      {txn.date}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={txn.type === "IN" ? "default" : "secondary"}
                        className={`text-xs ${txn.type === "IN" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-rose-100 text-rose-700 border-rose-200"}`}
                      >
                        {txn.type === "IN" ? (
                          <ArrowDownIcon className="h-3 w-3 mr-1 inline" />
                        ) : (
                          <ArrowUpIcon className="h-3 w-3 mr-1 inline" />
                        )}
                        {txn.type}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium tabular-nums ${txn.type === "IN" ? "text-emerald-600" : "text-rose-600"}`}
                    >
                      {txn.type === "IN" ? "+" : "-"}
                      {txn.quantity} {item.unit}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {txn.description || "—"}
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Inventory Card ───────────────────────────────────────────────────────────

interface InventoryCardProps {
  item: InventoryItem;
  index: number;
  onStockIn: (item: InventoryItem) => void;
  onStockOut: (item: InventoryItem) => void;
  onHistory: (item: InventoryItem) => void;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
}

function InventoryCard({
  item,
  index,
  onStockIn,
  onStockOut,
  onHistory,
  onEdit,
  onDelete,
}: InventoryCardProps) {
  const low = isLowStock(item);
  const critical = isCritical(item);
  const percent = stockPercent(item);

  const glowColor = critical ? "#DC2626" : "#F59E0B";

  const cardContent = (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: index * 0.04,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{
        y: -3,
        boxShadow: low
          ? "0 12px 40px -8px rgba(245,158,11,0.2)"
          : "0 12px 40px -8px rgba(0,0,0,0.08)",
        transition: { duration: 0.2 },
      }}
      className={`relative rounded-2xl border bg-surface p-4 flex flex-col gap-3 transition-colors ${
        critical
          ? "border-red-300 bg-red-50/30"
          : low
            ? "border-amber-300 bg-amber-50/20"
            : "border-border-light"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`shrink-0 rounded-xl p-2 ${
              critical ? "bg-red-100" : low ? "bg-amber-100" : "bg-muted"
            }`}
          >
            <PackageIcon
              className={`h-4 w-4 ${
                critical
                  ? "text-red-500"
                  : low
                    ? "text-amber-500"
                    : "text-text-secondary"
              }`}
            />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-text-primary truncate leading-tight">
              {item.name}
            </p>
            <p className="text-xs text-text-secondary">{item.unit}</p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Actions for ${item.name}`}
                className="shrink-0 h-7 w-7 text-text-secondary"
              />
            }
          >
            <MoreHorizontalIcon className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onStockIn(item)}>
              <ArrowDownIcon className="h-4 w-4" />
              Stock IN
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onStockOut(item)}
              disabled={item.quantity === 0}
            >
              <ArrowUpIcon className="h-4 w-4" />
              Stock OUT
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onHistory(item)}>
              <HistoryIcon className="h-4 w-4" />
              View History
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit(item)}>
              <PencilIcon className="h-4 w-4" />
              Edit Item
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(item)}
            >
              <Trash2Icon className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stock level */}
      <div className="space-y-1.5">
        <div className="flex items-end justify-between">
          <span className="text-xs text-text-secondary">In Stock</span>
          <span
            className={`text-xl font-bold tabular-nums ${
              critical
                ? "text-danger"
                : low
                  ? "text-amber-600"
                  : "text-text-primary"
            }`}
          >
            {item.quantity}
            <span className="text-xs font-normal text-text-secondary ml-1">
              {item.unit}
            </span>
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{
              duration: 0.7,
              delay: index * 0.04 + 0.2,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className={`h-full rounded-full ${
              critical ? "bg-danger" : low ? "bg-amber-400" : "bg-success"
            }`}
          />
        </div>

        <div className="flex justify-between text-xs text-text-secondary">
          <span>
            Min: {item.min_quantity} {item.unit}
          </span>
          {low && (
            <StatusBadge
              variant={inventoryStockVariant(item.quantity, item.min_quantity)}
            />
          )}
        </div>
      </div>

      {/* Quick action buttons */}
      <div className="flex gap-2 pt-1 border-t border-border-lighter">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs h-7 text-success border-emerald-200 hover:bg-emerald-50"
          onClick={() => onStockIn(item)}
        >
          <ArrowDownIcon className="h-3 w-3" />
          IN
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs h-7 text-danger border-red-200 hover:bg-red-50"
          onClick={() => onStockOut(item)}
          disabled={item.quantity === 0}
        >
          <ArrowUpIcon className="h-3 w-3" />
          OUT
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7 text-text-secondary"
          onClick={() => onHistory(item)}
        >
          <HistoryIcon className="h-3 w-3" />
        </Button>
      </div>
    </motion.div>
  );

  if (low) {
    return (
      <PulseGlow color={glowColor} className="rounded-2xl">
        {cardContent}
      </PulseGlow>
    );
  }

  return cardContent;
}

// ─── Main InventoryList ───────────────────────────────────────────────────────

export function InventoryList() {
  const [items, setItems] = React.useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [lowStockOnly, setLowStockOnly] = React.useState(false);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<InventoryItem | null>(
    null,
  );

  const [stockOpen, setStockOpen] = React.useState(false);
  const [stockItem, setStockItem] = React.useState<InventoryItem | null>(null);
  const [stockType, setStockType] = React.useState<"IN" | "OUT">("IN");

  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [historyItem, setHistoryItem] = React.useState<InventoryItem | null>(
    null,
  );

  const [deleteTarget, setDeleteTarget] = React.useState<InventoryItem | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = React.useState(false);

  const fetchItems = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (lowStockOnly) params.set("low_stock", "true");

      const res = await fetch(`/api/inventory?${params.toString()}`);
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to load inventory");
      }
      const data = (await res.json()) as InventoryItem[];
      setItems(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load inventory";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [lowStockOnly]);

  React.useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  function handleAddItem() {
    setEditingItem(null);
    setFormOpen(true);
  }

  function handleEditItem(item: InventoryItem) {
    setEditingItem(item);
    setFormOpen(true);
  }

  function handleStockIn(item: InventoryItem) {
    setStockItem(item);
    setStockType("IN");
    setStockOpen(true);
  }

  function handleStockOut(item: InventoryItem) {
    setStockItem(item);
    setStockType("OUT");
    setStockOpen(true);
  }

  function handleHistory(item: InventoryItem) {
    setHistoryItem(item);
    setHistoryOpen(true);
  }

  function handleDeleteClick(item: InventoryItem) {
    setDeleteTarget(item);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/inventory/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Delete failed");
      }
      toast.success(`${deleteTarget.name} removed from inventory`);
      setDeleteTarget(null);
      void fetchItems();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  const lowStockCount = items.filter(isLowStock).length;

  return (
    <PageTransition>
      <div className="flex flex-col gap-5">
        {/* ── Toolbar ────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="rounded-2xl border border-white/60 bg-surface/70 px-4 py-3 shadow-sm backdrop-blur-md flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          style={{ WebkitBackdropFilter: "blur(12px)" }}
        >
          <div className="flex items-center gap-3">
            <Select
              value={lowStockOnly ? "low" : "all"}
              onValueChange={(val) => {
                if (val != null) {
                  setLowStockOnly(val === "low");
                }
              }}
            >
              <SelectTrigger className="w-[160px] transition-all duration-200 focus:ring-2 focus:ring-brand/30 focus:border-brand">
                <span>{lowStockOnly ? "Low Stock Only" : "All Items"}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="low">Low Stock Only</SelectItem>
              </SelectContent>
            </Select>

            <AnimatePresence>
              {!isLoading && lowStockCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85, x: -8 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-sm text-amber-600 border border-amber-200"
                >
                  <AlertTriangleIcon className="h-3.5 w-3.5" />
                  <span className="font-medium">{lowStockCount} low stock</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            <Button
              onClick={handleAddItem}
              className="shrink-0 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] shadow-md shadow-blue-500/25"
            >
              <PlusIcon className="h-4 w-4" />
              Add Item
            </Button>
          </motion.div>
        </motion.div>

        {/* ── Count line ─────────────────────────────────────────────────────── */}
        {!isLoading && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className="text-sm text-text-secondary"
          >
            {items.length === 0
              ? lowStockOnly
                ? "No low-stock items"
                : 'No inventory items yet. Click "Add Item" to get started.'
              : `${items.length} item${items.length !== 1 ? "s" : ""}`}
          </motion.p>
        )}

        {/* ── Card grid ──────────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border bg-surface p-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-xl" />
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-1.5 w-full rounded-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-7 flex-1 rounded-lg" />
                  <Skeleton className="h-7 flex-1 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-dashed border-border-light bg-surface-secondary/50 p-12 text-center"
          >
            <PackageIcon className="mx-auto h-10 w-10 text-text-tertiary mb-3" />
            <p className="text-sm text-text-secondary">
              {lowStockOnly
                ? "All items are sufficiently stocked."
                : 'No inventory items yet. Click "Add Item" to get started.'}
            </p>
          </motion.div>
        ) : (
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item, index) => (
              <StaggerItem key={item.id}>
                <InventoryCard
                  item={item}
                  index={index}
                  onStockIn={handleStockIn}
                  onStockOut={handleStockOut}
                  onHistory={handleHistory}
                  onEdit={handleEditItem}
                  onDelete={handleDeleteClick}
                />
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}

        {/* ── Dialogs ────────────────────────────────────────────────────────── */}
        <ItemFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          item={editingItem}
          onSuccess={() => void fetchItems()}
        />

        <StockDialog
          open={stockOpen}
          onOpenChange={setStockOpen}
          item={stockItem}
          defaultType={stockType}
          onSuccess={() => void fetchItems()}
        />

        <HistoryDialog
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          item={historyItem}
        />

        <Dialog
          open={deleteTarget != null}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Inventory Item</DialogTitle>
            </DialogHeader>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
            >
              <p className="text-sm text-text-secondary">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-text-primary">
                  {deleteTarget?.name}
                </span>
                ? This will also remove all associated transaction history.
              </p>
            </motion.div>
            <DialogFooter>
              <Button
                variant="destructive"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
              >
                {isDeleting ? (
                  <span className="flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white"
                    />
                    Deleting...
                  </span>
                ) : (
                  "Delete"
                )}
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
