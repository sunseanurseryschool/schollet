"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
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
import { createStaffSchema, updateStaffSchema, type CreateStaffInput } from "@/lib/schemas/staff";

interface Role {
  id: string;
  name: string;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role_id: string;
  salary: number;
  is_active: boolean;
}

interface StaffFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff?: StaffMember | null;
  roles: Role[];
  onSuccess: () => void;
}

const fieldVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      delay: i * 0.07,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
};

export function StaffFormDialog({
  open,
  onOpenChange,
  staff,
  roles,
  onSuccess,
}: StaffFormDialogProps) {
  const isEditing = staff != null;
  const [isPending, setIsPending] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateStaffInput>({
    resolver: zodResolver(isEditing ? updateStaffSchema as unknown as typeof createStaffSchema : createStaffSchema),
    defaultValues: { name: "", email: "", password: "", role_id: "", salary: 0 },
  });

  React.useEffect(() => {
    if (open && staff) {
      reset({ name: staff.name, email: staff.email, password: "", role_id: staff.role_id, salary: staff.salary });
    } else if (open && !staff) {
      reset({ name: "", email: "", password: "", role_id: "", salary: 0 });
    }
  }, [open, staff, reset]);

  const roleValue = watch("role_id");

  async function onSubmit(data: CreateStaffInput) {
    setIsPending(true);
    try {
      const url = isEditing ? `/api/staff/${staff!.id}` : "/api/staff";
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
      toast.success(isEditing ? "Staff member updated successfully" : "Staff member added successfully");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Staff Member" : "Add Staff Member"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid gap-4 py-2">
            {/* Name */}
            <motion.div
              custom={0}
              variants={fieldVariants}
              initial="hidden"
              animate={open ? "visible" : "hidden"}
              className="grid gap-1.5"
            >
              <Label htmlFor="staff-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="staff-name"
                placeholder="Full name"
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </motion.div>

            {/* Email */}
            <motion.div
              custom={1}
              variants={fieldVariants}
              initial="hidden"
              animate={open ? "visible" : "hidden"}
              className="grid gap-1.5"
            >
              <Label htmlFor="staff-email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="staff-email"
                type="email"
                placeholder="staff@school.edu"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </motion.div>

            {/* Password */}
            <motion.div
              custom={2}
              variants={fieldVariants}
              initial="hidden"
              animate={open ? "visible" : "hidden"}
              className="grid gap-1.5"
            >
              <Label htmlFor="staff-password">
                Password {!isEditing && <span className="text-destructive">*</span>}
              </Label>
              <div className="relative">
                <Input
                  id="staff-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={isEditing ? "Leave empty to keep current" : "Min 6 characters"}
                  aria-invalid={!!errors.password}
                  className="pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
              <p className="text-xs text-text-tertiary">
                {isEditing ? "Enter a new password to reset, or leave empty to keep current." : "This will be the staff member's login password."}
              </p>
            </motion.div>

            {/* Role */}
            <motion.div
              custom={2}
              variants={fieldVariants}
              initial="hidden"
              animate={open ? "visible" : "hidden"}
              className="grid gap-1.5"
            >
              <Label htmlFor="staff-role">
                Role <span className="text-destructive">*</span>
              </Label>
              <Select
                value={roleValue ?? ""}
                onValueChange={(val) => {
                  if (val != null) setValue("role_id", val, { shouldValidate: true });
                }}
              >
                <SelectTrigger id="staff-role" className="w-full" aria-invalid={!!errors.role_id}>
                  <span>{roleValue ? roles.find((r) => r.id === roleValue)?.name ?? "Select role" : "Select role"}</span>
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role_id && (
                <p className="text-xs text-destructive">{errors.role_id.message}</p>
              )}
            </motion.div>

            {/* Salary */}
            <motion.div
              custom={3}
              variants={fieldVariants}
              initial="hidden"
              animate={open ? "visible" : "hidden"}
              className="grid gap-1.5"
            >
              <Label htmlFor="staff-salary">Salary (₹) per month</Label>
              <Input
                id="staff-salary"
                type="number"
                min={0}
                step={0.01}
                placeholder="0"
                aria-invalid={!!errors.salary}
                {...register("salary", { valueAsNumber: true })}
              />
              {errors.salary && (
                <p className="text-xs text-destructive">{errors.salary.message}</p>
              )}
            </motion.div>
          </div>

          <DialogFooter showCloseButton>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1e40af] text-white border-0"
            >
              {isPending
                ? isEditing
                  ? "Saving..."
                  : "Adding..."
                : isEditing
                  ? "Save Changes"
                  : "Add Staff"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
