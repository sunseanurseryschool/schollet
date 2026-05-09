"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createExpenseSchema,
  EXPENSE_CATEGORY_VALUES,
  type CreateExpenseInput,
  type ExpenseCategory,
} from "@/lib/schemas/expense";

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CATEGORY_DOT_COLOR: Record<ExpenseCategory, string> = {
  Utilities:   "bg-blue-400",
  Maintenance: "bg-orange-400",
  Supplies:    "bg-violet-400",
  Transport:   "bg-cyan-400",
  Inventory:   "bg-emerald-500",
  Salary:      "bg-rose-400",
  Rent:        "bg-amber-400",
  Other:       "bg-slate-400",
};

const fieldVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      delay: i * 0.06,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
};

export function ExpenseFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: ExpenseFormDialogProps) {
  const [isPending, setIsPending] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateExpenseInput>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      amount: undefined,
      category: undefined,
      description: "",
      date: new Date().toISOString().slice(0, 10),
      isInventory: false,
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        amount: undefined,
        category: undefined,
        description: "",
        date: new Date().toISOString().slice(0, 10),
        isInventory: false,
      });
    }
  }, [open, reset]);

  const categoryValue = watch("category");

  async function onSubmit(data: CreateExpenseInput) {
    setIsPending(true);
    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          isInventory: data.category === "Inventory",
        }),
      });

      if (!response.ok) {
        const errorBody = (await response.json()) as { error?: string };
        throw new Error(errorBody.error ?? "Request failed");
      }

      toast.success("Expense recorded successfully");
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
          <DialogTitle>Add Expense</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid gap-4 py-2">

            {/* Amount — large bold styling */}
            <motion.div
              custom={0}
              variants={fieldVariants}
              initial="hidden"
              animate={open ? "visible" : "hidden"}
              className="grid gap-1.5"
            >
              <Label htmlFor="amount" className="text-xs uppercase tracking-wide text-text-secondary font-semibold">
                Amount (&#8377;) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xl font-bold text-text-secondary">
                  ₹
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  aria-invalid={!!errors.amount}
                  className="pl-8 text-2xl font-bold tracking-tight h-14 text-text-primary"
                  {...register("amount", { valueAsNumber: true })}
                />
              </div>
              {errors.amount && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-destructive"
                >
                  {errors.amount.message}
                </motion.p>
              )}
            </motion.div>

            {/* Category — with colored dot indicators */}
            <motion.div
              custom={1}
              variants={fieldVariants}
              initial="hidden"
              animate={open ? "visible" : "hidden"}
              className="grid gap-1.5"
            >
              <Label htmlFor="category" className="text-xs uppercase tracking-wide text-text-secondary font-semibold">
                Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={categoryValue ?? ""}
                onValueChange={(val) => {
                  if (val != null) {
                    setValue(
                      "category",
                      val as CreateExpenseInput["category"],
                      { shouldValidate: true }
                    );
                  }
                }}
              >
                <SelectTrigger
                  id="category"
                  className="w-full"
                  aria-invalid={!!errors.category}
                >
                  <SelectValue placeholder="Select category">
                    {categoryValue && (
                      <span className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-full ${CATEGORY_DOT_COLOR[categoryValue as ExpenseCategory]}`}
                        />
                        {categoryValue}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORY_VALUES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      <span className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-full ${CATEGORY_DOT_COLOR[cat]}`}
                        />
                        {cat}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-destructive"
                >
                  {errors.category.message}
                </motion.p>
              )}
            </motion.div>

            {/* Description */}
            <motion.div
              custom={2}
              variants={fieldVariants}
              initial="hidden"
              animate={open ? "visible" : "hidden"}
              className="grid gap-1.5"
            >
              <Label htmlFor="description" className="text-xs uppercase tracking-wide text-text-secondary font-semibold">
                Description <span className="text-destructive">*</span>
              </Label>
              <Input
                id="description"
                placeholder="Brief description of the expense"
                aria-invalid={!!errors.description}
                {...register("description")}
              />
              {errors.description && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-destructive"
                >
                  {errors.description.message}
                </motion.p>
              )}
            </motion.div>

            {/* Date */}
            <motion.div
              custom={3}
              variants={fieldVariants}
              initial="hidden"
              animate={open ? "visible" : "hidden"}
              className="grid gap-1.5"
            >
              <Label htmlFor="date" className="text-xs uppercase tracking-wide text-text-secondary font-semibold">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                aria-invalid={!!errors.date}
                {...register("date")}
              />
              {errors.date && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-destructive"
                >
                  {errors.date.message}
                </motion.p>
              )}
            </motion.div>
          </div>

          <DialogFooter showCloseButton>
            <motion.div
              whileHover={{ scale: isPending ? 1 : 1.02 }}
              whileTap={{ scale: isPending ? 1 : 0.97 }}
              transition={{ duration: 0.15 }}
            >
              <Button
                type="submit"
                disabled={isPending}
                className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] shadow-sm shadow-blue-500/20 hover:shadow-blue-500/30 transition-shadow"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white"
                    />
                    Saving...
                  </span>
                ) : (
                  "Add Expense"
                )}
              </Button>
            </motion.div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
