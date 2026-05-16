"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Pencil,
  Trash2,
  Wifi,
  WifiOff,
  SlidersHorizontal,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PageTransition,
  AnimatedCard,
  tableRowVariants,
} from "@/components/ui/animated";
import {
  createAccountSchema,
  createAccountAdjustmentSchema,
  type CreateAccountInput,
  type CreateAccountAdjustmentInput,
} from "@/lib/schemas/account";

interface Account {
  id: string;
  name: string;
  is_online: boolean;
  created_at: string;
  balance: number;
}

export function AccountsView() {
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState<Account | null>(
    null,
  );
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Account | null>(null);
  const [adjustTarget, setAdjustTarget] = React.useState<Account | null>(null);

  const fetchAccounts = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/accounts");
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to load accounts");
      }
      setAccounts((await res.json()) as Account[]);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load accounts",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  function openCreate() {
    setEditingAccount(null);
    setIsFormOpen(true);
  }

  function openEdit(account: Account) {
    setEditingAccount(account);
    setIsFormOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const account = deleteTarget;
    setDeletingId(account.id);
    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to delete account");
      }
      toast.success(`Deleted "${account.name}"`);
      setDeleteTarget(null);
      await fetchAccounts();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete account",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <PageTransition>
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            Manage the accounts where your school receives fees and pays expenses, salaries, and purchases.
          </p>
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            <Button
              onClick={openCreate}
              style={{
                background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                boxShadow: "0 4px 14px -3px rgba(37,99,235,0.45)",
              }}
              className="border-0 text-white hover:opacity-90 transition-opacity duration-150"
            >
              <Plus className="h-4 w-4" />
              Add Account
            </Button>
          </motion.div>
        </div>

        <AnimatedCard
          className="rounded-xl ring-1 ring-foreground/10 bg-surface overflow-hidden"
          hover={false}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-[140px]">Type</TableHead>
                <TableHead className="w-[160px] text-right">Balance</TableHead>
                <TableHead className="w-[180px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : accounts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-32 text-center text-text-secondary"
                  >
                    No accounts yet. Add one to start recording transactions.
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((acc, i) => (
                  <motion.tr
                    key={acc.id}
                    custom={i}
                    variants={tableRowVariants}
                    initial="hidden"
                    animate="visible"
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">{acc.name}</TableCell>
                    <TableCell>
                      {acc.is_online ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                          <Wifi className="size-3" />
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
                          <WifiOff className="size-3" />
                          Offline
                        </span>
                      )}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono tabular-nums",
                        acc.balance === 0
                          ? "text-text-secondary"
                          : acc.balance > 0
                            ? "text-success font-semibold"
                            : "text-danger font-semibold",
                      )}
                    >
                      {formatINR(acc.balance)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setAdjustTarget(acc)}
                          aria-label={`Adjust balance for ${acc.name}`}
                          title="Adjust balance"
                        >
                          <SlidersHorizontal className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(acc)}
                          aria-label={`Edit ${acc.name}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={deletingId === acc.id}
                          onClick={() => setDeleteTarget(acc)}
                          aria-label={`Delete ${acc.name}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))
              )}
            </TableBody>
          </Table>
        </AnimatedCard>

        <AccountFormDialog
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          account={editingAccount}
          onSuccess={fetchAccounts}
        />

        <AdjustBalanceDialog
          account={adjustTarget}
          onOpenChange={(open) => {
            if (!open) setAdjustTarget(null);
          }}
          onSuccess={fetchAccounts}
        />

        {/* ── Delete Confirmation Dialog ─────────────────────────────────── */}
        <Dialog
          open={deleteTarget != null}
          onOpenChange={(open) => {
            if (!open && deletingId === null) setDeleteTarget(null);
          }}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-text-secondary">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-text-primary">
                  {deleteTarget?.name}
                </span>
                ?
              </p>
              <p className="text-xs text-text-secondary">
                This action cannot be undone. Accounts that have fee, expense,
                salary, or inventory entries against them cannot be deleted.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="destructive"
                disabled={deletingId !== null}
                onClick={() => void handleDeleteConfirm()}
              >
                {deletingId !== null ? "Deleting..." : "Delete"}
              </Button>
              <Button
                variant="outline"
                disabled={deletingId !== null}
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

interface AccountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
  onSuccess: () => void | Promise<void>;
}

function AccountFormDialog({
  open,
  onOpenChange,
  account,
  onSuccess,
}: AccountFormDialogProps) {
  const isEditing = account != null;
  const [isPending, setIsPending] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateAccountInput>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: { name: "", is_online: false },
  });

  const isOnline = watch("is_online");

  React.useEffect(() => {
    if (open) {
      reset({
        name: account?.name ?? "",
        is_online: account?.is_online ?? false,
      });
    }
  }, [open, account, reset]);

  async function onSubmit(values: CreateAccountInput) {
    setIsPending(true);
    try {
      const url = isEditing ? `/api/accounts/${account.id}` : "/api/accounts";
      const method = isEditing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to save account");
      }
      toast.success(isEditing ? "Account updated" : "Account created");
      onOpenChange(false);
      await onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save account");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Account" : "Add Account"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 pt-2"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-name">Account name</Label>
            <Input
              id="account-name"
              placeholder="e.g. Cash, UPI, Bank"
              autoComplete="off"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-border-light bg-surface-tertiary/50 px-3 py-2.5">
            <Checkbox
              id="account-is-online"
              checked={isOnline}
              onCheckedChange={(checked) =>
                setValue("is_online", checked === true, {
                  shouldValidate: true,
                })
              }
            />
            <div className="flex-1">
              <Label htmlFor="account-is-online" className="cursor-pointer">
                Online account
              </Label>
              <p className="text-xs text-text-secondary">
                Tick for digital/bank accounts; leave unticked for cash.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEditing ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface AdjustBalanceDialogProps {
  account: Account | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void | Promise<void>;
}

function AdjustBalanceDialog({
  account,
  onOpenChange,
  onSuccess,
}: AdjustBalanceDialogProps) {
  const open = account != null;
  const [isPending, setIsPending] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateAccountAdjustmentInput>({
    resolver: zodResolver(createAccountAdjustmentSchema),
    defaultValues: { type: "increase", amount: undefined, reason: "" },
  });

  const type = watch("type");

  React.useEffect(() => {
    if (open) {
      reset({ type: "increase", amount: undefined, reason: "" });
    }
  }, [open, reset]);

  async function onSubmit(values: CreateAccountAdjustmentInput) {
    if (!account) return;
    setIsPending(true);
    try {
      const res = await fetch(`/api/accounts/${account.id}/adjustments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to record adjustment");
      }
      const delta = values.type === "increase" ? "+" : "−";
      toast.success(`Recorded ${delta}${values.amount} on ${account.name}`);
      onOpenChange(false);
      await onSuccess();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to record adjustment",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Balance{account ? ` — ${account.name}` : ""}</DialogTitle>
        </DialogHeader>

        {account && (
          <div className="mb-2 rounded-lg bg-surface-tertiary/50 px-3 py-2 text-sm">
            <span className="text-text-secondary">Current balance: </span>
            <span
              className={cn(
                "font-mono font-semibold tabular-nums",
                account.balance === 0
                  ? "text-text-secondary"
                  : account.balance > 0
                    ? "text-success"
                    : "text-danger",
              )}
            >
              {formatINR(account.balance)}
            </span>
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={cn(
                "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                type === "increase"
                  ? "border-success bg-success/10 text-success"
                  : "border-border-light text-text-secondary hover:bg-muted/50",
              )}
              onClick={() =>
                setValue("type", "increase", { shouldValidate: true })
              }
            >
              + Increase
            </button>
            <button
              type="button"
              className={cn(
                "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                type === "decrease"
                  ? "border-danger bg-danger/10 text-danger"
                  : "border-border-light text-text-secondary hover:bg-muted/50",
              )}
              onClick={() =>
                setValue("type", "decrease", { shouldValidate: true })
              }
            >
              − Decrease
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adjust-amount">
              Amount (₹) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="adjust-amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              aria-invalid={!!errors.amount}
              {...register("amount", { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adjust-reason">
              Reason <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="adjust-reason"
              rows={3}
              placeholder="e.g. Opening balance, correction for missed entry, petty cash deposit"
              aria-invalid={!!errors.reason}
              className="rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              {...register("reason")}
            />
            {errors.reason && (
              <p className="text-xs text-destructive">{errors.reason.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Confirm adjustment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
