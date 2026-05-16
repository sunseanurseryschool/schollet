"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon, Loader2Icon } from "lucide-react";
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
  createFeeConfigSchema,
  type CreateFeeConfigInput,
} from "@/lib/schemas/fee-config";
import { GRADES, ACADEMIC_YEARS } from "@/lib/constants";
import type { FeeConfigWithHeads } from "@/services/fee-config";

interface FeeConfigFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config?: FeeConfigWithHeads | null;
  onSuccess: () => void;
}

const DEFAULT_HEADS: CreateFeeConfigInput["fee_heads"] = [
  { name: "Tuition", amount: 0 },
  { name: "Transport", amount: 0 },
  { name: "Books", amount: 0 },
];

const FIELD_STAGGER_DELAY = 0.05;

const fieldVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      delay: i * FIELD_STAGGER_DELAY,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
};

const feeHeadRowVariants = {
  hidden: { opacity: 0, x: -12, height: 0 },
  visible: {
    opacity: 1,
    x: 0,
    height: "auto",
    transition: {
      duration: 0.25,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  },
  exit: {
    opacity: 0,
    x: 12,
    height: 0,
    transition: {
      duration: 0.2,
      ease: [0.55, 0, 1, 0.45] as [number, number, number, number],
    },
  },
};

function computeHeadSum(heads: CreateFeeConfigInput["fee_heads"]): number {
  return (
    Math.round(
      heads.reduce((acc, h) => acc + (Number(h.amount) || 0), 0) * 100,
    ) / 100
  );
}

export function FeeConfigFormDialog({
  open,
  onOpenChange,
  config,
  onSuccess,
}: FeeConfigFormDialogProps) {
  const isEditing = config != null;
  const [isPending, setIsPending] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateFeeConfigInput>({
    resolver: zodResolver(createFeeConfigSchema),
    defaultValues: {
      grade: undefined,
      academic_year: "",
      total_fee: 0,
      fee_heads: DEFAULT_HEADS,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "fee_heads",
  });

  const gradeValue = watch("grade");
  const feeHeads = watch("fee_heads");
  const headSum = computeHeadSum(feeHeads);

  // Sync total_fee to sum of heads automatically
  React.useEffect(() => {
    setValue("total_fee", headSum, { shouldValidate: false });
  }, [headSum, setValue]);

  React.useEffect(() => {
    if (open && config) {
      reset({
        grade: config.grade,
        academic_year: config.academic_year,
        total_fee: config.total_fee,
        fee_heads:
          config.fee_heads.length > 0
            ? config.fee_heads.map((h) => ({ name: h.name, amount: h.amount }))
            : DEFAULT_HEADS,
      });
    } else if (open && !config) {
      reset({
        grade: undefined,
        academic_year: "",
        total_fee: 0,
        fee_heads: DEFAULT_HEADS,
      });
    }
  }, [open, config, reset]);

  function handleAddHead() {
    append({ name: "", amount: 0 });
  }

  async function onSubmit(data: CreateFeeConfigInput) {
    setIsPending(true);
    try {
      const url = isEditing
        ? `/api/fee-configs/${config!.id}`
        : "/api/fee-configs";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorBody = (await response.json()) as { error?: string };
        throw new Error(errorBody.error ?? "Request failed");
      }

      toast.success(
        isEditing
          ? "Fee configuration updated successfully"
          : "Fee configuration created successfully",
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

  const totalFeeError = errors.total_fee?.message;
  const feeHeadsError =
    errors.fee_heads?.root?.message ?? errors.fee_heads?.message;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Fee Configuration" : "Add Fee Configuration"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <AnimatePresence mode="wait">
            {open && (
              <motion.div
                key="fee-form-fields"
                initial="hidden"
                animate="visible"
                className="grid gap-4 py-2"
              >
                {/* Grade */}
                <motion.div
                  variants={fieldVariants}
                  custom={0}
                  className="grid gap-1.5"
                >
                  <Label htmlFor="grade">
                    Grade <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={gradeValue ?? ""}
                    onValueChange={(val) => {
                      if (val != null) {
                        setValue(
                          "grade",
                          val as CreateFeeConfigInput["grade"],
                          { shouldValidate: true },
                        );
                      }
                    }}
                  >
                    <SelectTrigger
                      id="grade"
                      className="w-full transition-all duration-200 focus:ring-2 focus:ring-brand/30 focus:border-brand"
                      aria-invalid={!!errors.grade}
                    >
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADES.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.grade && (
                    <p className="text-xs text-destructive">
                      {errors.grade.message}
                    </p>
                  )}
                </motion.div>

                {/* Academic Year */}
                <motion.div
                  variants={fieldVariants}
                  custom={1}
                  className="grid gap-1.5"
                >
                  <Label htmlFor="academic_year">
                    Academic Year <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={watch("academic_year") || ""}
                    onValueChange={(val) => {
                      if (val != null) {
                        setValue("academic_year", val, {
                          shouldValidate: true,
                        });
                      }
                    }}
                  >
                    <SelectTrigger
                      id="academic_year"
                      className="w-full transition-all duration-200 focus:ring-2 focus:ring-brand/30 focus:border-brand"
                      aria-invalid={!!errors.academic_year}
                    >
                      <span>{watch("academic_year") || "Select year"}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {ACADEMIC_YEARS.map((y) => (
                        <SelectItem key={y} value={y}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.academic_year && (
                    <p className="text-xs text-destructive">
                      {errors.academic_year.message}
                    </p>
                  )}
                </motion.div>

                {/* Fee Heads */}
                <motion.div
                  variants={fieldVariants}
                  custom={2}
                  className="grid gap-2"
                >
                  <div className="flex items-center justify-between">
                    <Label>
                      Fee Heads <span className="text-destructive">*</span>
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddHead}
                      className="transition-all duration-150 hover:border-brand hover:text-brand"
                    >
                      <PlusIcon className="h-3.5 w-3.5" />
                      Add Head
                    </Button>
                  </div>

                  {feeHeadsError && (
                    <p className="text-xs text-destructive">{feeHeadsError}</p>
                  )}

                  <div className="grid gap-2">
                    {/* Column headers */}
                    <div className="grid grid-cols-[1fr_120px_32px] gap-2 px-1">
                      <span className="text-xs font-medium text-text-secondary">
                        Name
                      </span>
                      <span className="text-xs font-medium text-text-secondary">
                        Amount (Rs)
                      </span>
                      <span />
                    </div>

                    {/* Animated fee head rows */}
                    <AnimatePresence initial={false}>
                      {fields.map((field, index) => (
                        <motion.div
                          key={field.id}
                          variants={feeHeadRowVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="grid grid-cols-[1fr_120px_32px] gap-2 items-start overflow-hidden"
                        >
                          <div>
                            <Input
                              placeholder="e.g. Tuition"
                              aria-invalid={!!errors.fee_heads?.[index]?.name}
                              className="transition-all duration-200 focus:ring-2 focus:ring-brand/30 focus:border-brand"
                              {...register(`fee_heads.${index}.name`)}
                            />
                            {errors.fee_heads?.[index]?.name && (
                              <p className="text-xs text-destructive mt-0.5">
                                {errors.fee_heads[index].name?.message}
                              </p>
                            )}
                          </div>
                          <div>
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              placeholder="0.00"
                              aria-invalid={!!errors.fee_heads?.[index]?.amount}
                              className="transition-all duration-200 focus:ring-2 focus:ring-brand/30 focus:border-brand"
                              {...register(`fee_heads.${index}.amount`, {
                                valueAsNumber: true,
                              })}
                            />
                            {errors.fee_heads?.[index]?.amount && (
                              <p className="text-xs text-destructive mt-0.5">
                                {errors.fee_heads[index].amount?.message}
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0 text-text-secondary hover:text-destructive transition-colors duration-150"
                            onClick={() => remove(index)}
                            aria-label={`Remove fee head ${index + 1}`}
                            disabled={fields.length === 1}
                          >
                            <Trash2Icon className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>

                {/* Total Fee summary */}
                <motion.div variants={fieldVariants} custom={3}>
                  <div
                    className="rounded-xl border border-border-lighter px-4 py-3 flex items-center justify-between"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--surface-secondary) 0%, var(--surface) 100%)",
                    }}
                  >
                    <span className="text-sm font-medium text-text-primary">
                      Total Fee
                    </span>
                    <motion.span
                      key={headSum}
                      initial={{ opacity: 0.6, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className="text-base font-semibold text-brand"
                    >
                      Rs{" "}
                      {headSum.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </motion.span>
                  </div>
                  {/* Hidden field keeps total_fee in sync for validation */}
                  <input
                    type="hidden"
                    {...register("total_fee", { valueAsNumber: true })}
                  />
                  {totalFeeError && (
                    <p className="text-xs text-destructive mt-1">
                      {totalFeeError}
                    </p>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <DialogFooter showCloseButton>
            <motion.div
              whileHover={{ scale: isPending ? 1 : 1.02 }}
              whileTap={{ scale: isPending ? 1 : 0.98 }}
              transition={{ duration: 0.12 }}
            >
              <Button
                type="submit"
                disabled={isPending}
                style={{
                  background: isPending
                    ? undefined
                    : "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                  boxShadow: isPending
                    ? undefined
                    : "0 4px 14px -3px rgba(37,99,235,0.35)",
                }}
                className="border-0 text-white transition-opacity duration-150 hover:opacity-90 disabled:opacity-60"
              >
                <AnimatePresence mode="wait">
                  {isPending ? (
                    <motion.span
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                      className="flex items-center gap-2"
                    >
                      <Loader2Icon className="h-4 w-4 animate-spin" />
                      {isEditing ? "Saving..." : "Creating..."}
                    </motion.span>
                  ) : (
                    <motion.span
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                    >
                      {isEditing ? "Save Changes" : "Create Config"}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
