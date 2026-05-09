"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2Icon } from "lucide-react";
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
import { createStudentSchema, type CreateStudentInput } from "@/lib/schemas/student";
import { GRADES, SECTIONS } from "@/lib/constants";
import type { Student } from "@/types/database";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "transferred", label: "Transferred" },
] as const;

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

interface StudentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student | null;
  onSuccess: () => void;
}

export function StudentFormDialog({
  open,
  onOpenChange,
  student,
  onSuccess,
}: StudentFormDialogProps) {
  const isEditing = student != null;
  const [isPending, setIsPending] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateStudentInput>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      admission_no: "",
      name: "",
      grade: undefined,
      section: undefined,
      status: "active",
      parent_name: "",
      parent_phone: "",
    },
  });

  // Populate form when editing
  React.useEffect(() => {
    if (open && student) {
      reset({
        admission_no: student.admission_no,
        name: student.name,
        grade: student.grade,
        section: student.section,
        status: student.status,
        parent_name: student.parent_name,
        parent_phone: student.parent_phone,
      });
    } else if (open && !student) {
      reset({
        admission_no: "",
        name: "",
        grade: undefined,
        section: undefined,
        status: "active",
        parent_name: "",
        parent_phone: "",
      });
    }
  }, [open, student, reset]);

  const gradeValue = watch("grade");
  const sectionValue = watch("section");
  const statusValue = watch("status");

  async function onSubmit(data: CreateStudentInput) {
    setIsPending(true);
    try {
      const url = isEditing ? `/api/students/${student!.id}` : "/api/students";
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
        isEditing ? "Student updated successfully" : "Student added successfully"
      );
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Student" : "Add New Student"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <AnimatePresence mode="wait">
            {open && (
              <motion.div
                key="form-fields"
                initial="hidden"
                animate="visible"
                className="grid gap-4 py-2"
              >
                {/* Admission Number */}
                <motion.div variants={fieldVariants} custom={0} className="grid gap-1.5">
                  <Label htmlFor="admission_no">
                    Admission No
                  </Label>
                  <Input
                    id="admission_no"
                    placeholder="Leave empty to auto-generate"
                    aria-invalid={!!errors.admission_no}
                    className="transition-all duration-200 focus:ring-2 focus:ring-brand/30 focus:border-brand"
                    {...register("admission_no")}
                  />
                  {errors.admission_no && (
                    <p className="text-xs text-destructive">
                      {errors.admission_no.message}
                    </p>
                  )}
                </motion.div>

                {/* Name */}
                <motion.div variants={fieldVariants} custom={1} className="grid gap-1.5">
                  <Label htmlFor="name">
                    Student Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Full name"
                    aria-invalid={!!errors.name}
                    className="transition-all duration-200 focus:ring-2 focus:ring-brand/30 focus:border-brand"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name.message}</p>
                  )}
                </motion.div>

                {/* Grade & Section */}
                <motion.div
                  variants={fieldVariants}
                  custom={2}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="grid gap-1.5">
                    <Label htmlFor="grade">
                      Grade <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={gradeValue ?? ""}
                      onValueChange={(val) => {
                        if (val != null) {
                          setValue("grade", val as CreateStudentInput["grade"], {
                            shouldValidate: true,
                          });
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
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="section">
                      Section <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={sectionValue ?? ""}
                      onValueChange={(val) => {
                        if (val != null) {
                          setValue(
                            "section",
                            val as CreateStudentInput["section"],
                            { shouldValidate: true }
                          );
                        }
                      }}
                    >
                      <SelectTrigger
                        id="section"
                        className="w-full transition-all duration-200 focus:ring-2 focus:ring-brand/30 focus:border-brand"
                        aria-invalid={!!errors.section}
                      >
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        {SECTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.section && (
                      <p className="text-xs text-destructive">
                        {errors.section.message}
                      </p>
                    )}
                  </div>
                </motion.div>

                {/* Status */}
                <motion.div variants={fieldVariants} custom={3} className="grid gap-1.5">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={statusValue ?? "active"}
                    onValueChange={(val) => {
                      setValue(
                        "status",
                        val as CreateStudentInput["status"],
                        { shouldValidate: true }
                      );
                    }}
                  >
                    <SelectTrigger
                      id="status"
                      className="w-full transition-all duration-200 focus:ring-2 focus:ring-brand/30 focus:border-brand"
                    >
                      <span>
                        {STATUS_OPTIONS.find((o) => o.value === (statusValue ?? "active"))?.label ?? "Select status"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>

                {/* Parent Name */}
                <motion.div variants={fieldVariants} custom={4} className="grid gap-1.5">
                  <Label htmlFor="parent_name">Parent / Guardian Name</Label>
                  <Input
                    id="parent_name"
                    placeholder="Parent's full name"
                    aria-invalid={!!errors.parent_name}
                    className="transition-all duration-200 focus:ring-2 focus:ring-brand/30 focus:border-brand"
                    {...register("parent_name")}
                  />
                  {errors.parent_name && (
                    <p className="text-xs text-destructive">
                      {errors.parent_name.message}
                    </p>
                  )}
                </motion.div>

                {/* Parent Phone */}
                <motion.div variants={fieldVariants} custom={5} className="grid gap-1.5">
                  <Label htmlFor="parent_phone">Parent Phone</Label>
                  <Input
                    id="parent_phone"
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    aria-invalid={!!errors.parent_phone}
                    className="transition-all duration-200 focus:ring-2 focus:ring-brand/30 focus:border-brand"
                    {...register("parent_phone")}
                  />
                  {errors.parent_phone && (
                    <p className="text-xs text-destructive">
                      {errors.parent_phone.message}
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
                      {isEditing ? "Saving..." : "Adding..."}
                    </motion.span>
                  ) : (
                    <motion.span
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                    >
                      {isEditing ? "Save Changes" : "Add Student"}
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
