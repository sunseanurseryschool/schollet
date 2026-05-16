"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, type UseFormRegister, type FieldErrors } from "react-hook-form";
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
import {
  BLOOD_GROUP_VALUES,
  GENDER_VALUES,
  createStudentSchema,
  type CreateStudentInput,
} from "@/lib/schemas/student";
import { GRADES, SECTIONS } from "@/lib/constants";
import type { Student } from "@/types/database";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "transferred", label: "Transferred" },
] as const;

const GENDER_LABELS: Record<(typeof GENDER_VALUES)[number], string> = {
  male: "Male",
  female: "Female",
  other: "Other",
};

const BLOOD_GROUP_LABELS: Record<(typeof BLOOD_GROUP_VALUES)[number], string> = {
  "A+": "A+",
  "A-": "A-",
  "B+": "B+",
  "B-": "B-",
  "AB+": "AB+",
  "AB-": "AB-",
  "O+": "O+",
  "O-": "O-",
  unknown: "Unknown",
};

const sectionVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      delay: i * 0.06,
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

function emptyDefaults(): CreateStudentInput {
  return {
    admission_no: "",
    name: "",
    gender: "",
    date_of_birth: "",
    blood_group: "",
    nationality: "",
    religion: "",
    community: "",
    caste: "",
    aadhaar_no: "",
    grade: undefined as unknown as CreateStudentInput["grade"],
    section: undefined as unknown as CreateStudentInput["section"],
    status: "active",
    father_name: "",
    father_occupation: "",
    father_company: "",
    father_mobile: "",
    father_email: "",
    father_annual_income: undefined,
    mother_name: "",
    mother_occupation: "",
    mother_company: "",
    mother_mobile: "",
    mother_email: "",
    mother_annual_income: undefined,
    guardian_name: "",
    guardian_relationship: "",
    guardian_mobile: "",
    guardian_address: "",
    address_line: "",
    city: "",
    state: "",
    pin_code: "",
    emergency_contact: "",
    alternate_phone: "",
  };
}

function fromStudent(student: Student): CreateStudentInput {
  return {
    admission_no: student.admission_no,
    name: student.name,
    gender: student.gender ?? "",
    date_of_birth: student.date_of_birth ?? "",
    blood_group: student.blood_group ?? "",
    nationality: student.nationality ?? "",
    religion: student.religion ?? "",
    community: student.community ?? "",
    caste: student.caste ?? "",
    aadhaar_no: student.aadhaar_no ?? "",
    grade: student.grade,
    section: student.section,
    status: student.status,
    father_name: student.father_name ?? "",
    father_occupation: student.father_occupation ?? "",
    father_company: student.father_company ?? "",
    father_mobile: student.father_mobile ?? "",
    father_email: student.father_email ?? "",
    father_annual_income: student.father_annual_income ?? undefined,
    mother_name: student.mother_name ?? "",
    mother_occupation: student.mother_occupation ?? "",
    mother_company: student.mother_company ?? "",
    mother_mobile: student.mother_mobile ?? "",
    mother_email: student.mother_email ?? "",
    mother_annual_income: student.mother_annual_income ?? undefined,
    guardian_name: student.guardian_name ?? "",
    guardian_relationship: student.guardian_relationship ?? "",
    guardian_mobile: student.guardian_mobile ?? "",
    guardian_address: student.guardian_address ?? "",
    address_line: student.address_line ?? "",
    city: student.city ?? "",
    state: student.state ?? "",
    pin_code: student.pin_code ?? "",
    emergency_contact: student.emergency_contact ?? "",
    alternate_phone: student.alternate_phone ?? "",
  };
}

function computeAge(dob: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return "";
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return "";
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) years--;
  if (years < 0) return "";
  if (years === 0) {
    const months =
      (today.getFullYear() - birth.getFullYear()) * 12 +
      (today.getMonth() - birth.getMonth()) -
      (today.getDate() < birth.getDate() ? 1 : 0);
    return `${Math.max(0, months)} months`;
  }
  return `${years} years`;
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
    defaultValues: emptyDefaults(),
  });

  React.useEffect(() => {
    if (!open) return;
    reset(student ? fromStudent(student) : emptyDefaults());
  }, [open, student, reset]);

  const gradeValue = watch("grade");
  const sectionValue = watch("section");
  const statusValue = watch("status");
  const genderValue = watch("gender");
  const bloodGroupValue = watch("blood_group");
  const dobValue = watch("date_of_birth");
  const ageDisplay = computeAge(dobValue ?? "");

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
      toast.success(isEditing ? "Student updated" : "Student added");
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
      <DialogContent className="sm:max-w-3xl h-[90vh] !p-0 !gap-0 flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0 border-b border-border-light px-6 pt-6 pb-4">
          <DialogTitle>
            {isEditing ? "Edit Student" : "Add New Student"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 overflow-y-auto px-6 py-5">
          <AnimatePresence mode="wait">
            {open && (
              <motion.div
                key="form-fields"
                initial="hidden"
                animate="visible"
                className="flex flex-col gap-6"
              >
                {/* ── Section 1: Basic ───────────────────────────────────── */}
                <FormSection title="Basic Details" index={0}>
                  <FieldText
                    id="admission_no"
                    label="Admission No"
                    placeholder="Leave empty to auto-generate"
                    register={register}
                    errors={errors}
                  />
                  <FieldText
                    id="name"
                    label="Student Name"
                    required
                    placeholder="As per birth certificate"
                    register={register}
                    errors={errors}
                  />

                  <div className="grid gap-1.5">
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      value={genderValue ?? ""}
                      onValueChange={(val) => {
                        setValue("gender", val as CreateStudentInput["gender"], {
                          shouldValidate: true,
                        });
                      }}
                    >
                      <SelectTrigger id="gender" className="w-full">
                        <span>
                          {genderValue
                            ? GENDER_LABELS[
                                genderValue as keyof typeof GENDER_LABELS
                              ]
                            : "Select gender"}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {GENDER_VALUES.map((g) => (
                          <SelectItem key={g} value={g}>
                            {GENDER_LABELS[g]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="date_of_birth">Date of Birth</Label>
                      {ageDisplay && (
                        <span className="text-xs text-text-secondary">
                          Age: {ageDisplay}
                        </span>
                      )}
                    </div>
                    <Input
                      id="date_of_birth"
                      type="date"
                      aria-invalid={!!errors.date_of_birth}
                      {...register("date_of_birth")}
                    />
                    {errors.date_of_birth && (
                      <p className="text-xs text-destructive">
                        {errors.date_of_birth.message}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="blood_group">Blood Group</Label>
                    <Select
                      value={bloodGroupValue ?? ""}
                      onValueChange={(val) => {
                        setValue(
                          "blood_group",
                          val as CreateStudentInput["blood_group"],
                          { shouldValidate: true },
                        );
                      }}
                    >
                      <SelectTrigger id="blood_group" className="w-full">
                        <span>
                          {bloodGroupValue
                            ? BLOOD_GROUP_LABELS[
                                bloodGroupValue as keyof typeof BLOOD_GROUP_LABELS
                              ]
                            : "Select blood group"}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {BLOOD_GROUP_VALUES.map((b) => (
                          <SelectItem key={b} value={b}>
                            {BLOOD_GROUP_LABELS[b]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <FieldText
                    id="nationality"
                    label="Nationality"
                    placeholder="e.g. Indian"
                    register={register}
                    errors={errors}
                  />
                  <FieldText
                    id="religion"
                    label="Religion"
                    register={register}
                    errors={errors}
                  />
                  <FieldText
                    id="community"
                    label="Community"
                    register={register}
                    errors={errors}
                  />
                  <FieldText
                    id="caste"
                    label="Caste"
                    register={register}
                    errors={errors}
                  />
                  <FieldText
                    id="aadhaar_no"
                    label="Aadhaar Number"
                    placeholder="12 digits"
                    register={register}
                    errors={errors}
                  />

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
                        className="w-full"
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
                            { shouldValidate: true },
                          );
                        }
                      }}
                    >
                      <SelectTrigger
                        id="section"
                        className="w-full"
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

                  <div className="grid gap-1.5">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={statusValue ?? "active"}
                      onValueChange={(val) => {
                        setValue("status", val as CreateStudentInput["status"], {
                          shouldValidate: true,
                        });
                      }}
                    >
                      <SelectTrigger id="status" className="w-full">
                        <span>
                          {STATUS_OPTIONS.find(
                            (o) => o.value === (statusValue ?? "active"),
                          )?.label ?? "Select status"}
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
                  </div>
                </FormSection>

                {/* ── Section 2: Father ─────────────────────────────────── */}
                <FormSection title="Father Details" index={1}>
                  <FieldText
                    id="father_name"
                    label="Full Name"
                    register={register}
                    errors={errors}
                  />
                  <FieldText
                    id="father_occupation"
                    label="Occupation"
                    register={register}
                    errors={errors}
                  />
                  <FieldText
                    id="father_company"
                    label="Company / Business"
                    register={register}
                    errors={errors}
                  />
                  <FieldText
                    id="father_mobile"
                    label="Mobile Number"
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    register={register}
                    errors={errors}
                  />
                  <FieldText
                    id="father_email"
                    label="Email"
                    type="email"
                    register={register}
                    errors={errors}
                  />
                  <FieldNumber
                    id="father_annual_income"
                    label="Annual Income (₹)"
                    register={register}
                    errors={errors}
                  />
                </FormSection>

                {/* ── Section 3: Mother ─────────────────────────────────── */}
                <FormSection title="Mother Details" index={2}>
                  <FieldText
                    id="mother_name"
                    label="Full Name"
                    register={register}
                    errors={errors}
                  />
                  <FieldText
                    id="mother_occupation"
                    label="Occupation"
                    register={register}
                    errors={errors}
                  />
                  <FieldText
                    id="mother_company"
                    label="Company / Business"
                    register={register}
                    errors={errors}
                  />
                  <FieldText
                    id="mother_mobile"
                    label="Mobile Number"
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    register={register}
                    errors={errors}
                  />
                  <FieldText
                    id="mother_email"
                    label="Email"
                    type="email"
                    register={register}
                    errors={errors}
                  />
                  <FieldNumber
                    id="mother_annual_income"
                    label="Annual Income (₹)"
                    register={register}
                    errors={errors}
                  />
                </FormSection>

                {/* ── Section 4: Guardian ───────────────────────────────── */}
                <FormSection
                  title="Guardian Details"
                  subtitle="Fill only if applicable"
                  index={3}
                >
                  <FieldText
                    id="guardian_name"
                    label="Name"
                    register={register}
                    errors={errors}
                  />
                  <FieldText
                    id="guardian_relationship"
                    label="Relationship"
                    placeholder="e.g. Uncle, Grandfather"
                    register={register}
                    errors={errors}
                  />
                  <FieldText
                    id="guardian_mobile"
                    label="Contact Number"
                    type="tel"
                    register={register}
                    errors={errors}
                  />
                  <div className="grid gap-1.5 sm:col-span-2">
                    <Label htmlFor="guardian_address">Address</Label>
                    <textarea
                      id="guardian_address"
                      rows={2}
                      className="rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      {...register("guardian_address")}
                    />
                    {errors.guardian_address && (
                      <p className="text-xs text-destructive">
                        {errors.guardian_address.message}
                      </p>
                    )}
                  </div>
                </FormSection>

                {/* ── Section 5: Address & Contact ──────────────────────── */}
                <FormSection title="Address & Contact" index={4}>
                  <div className="grid gap-1.5 sm:col-span-2">
                    <Label htmlFor="address_line">Residential Address</Label>
                    <textarea
                      id="address_line"
                      rows={2}
                      className="rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      {...register("address_line")}
                    />
                    {errors.address_line && (
                      <p className="text-xs text-destructive">
                        {errors.address_line.message}
                      </p>
                    )}
                  </div>
                  <FieldText
                    id="city"
                    label="City"
                    register={register}
                    errors={errors}
                  />
                  <FieldText
                    id="state"
                    label="State"
                    register={register}
                    errors={errors}
                  />
                  <FieldText
                    id="pin_code"
                    label="PIN Code"
                    placeholder="6 digits"
                    register={register}
                    errors={errors}
                  />
                  <FieldText
                    id="emergency_contact"
                    label="Emergency Contact"
                    type="tel"
                    register={register}
                    errors={errors}
                  />
                  <FieldText
                    id="alternate_phone"
                    label="Alternate Phone"
                    type="tel"
                    register={register}
                    errors={errors}
                  />
                </FormSection>
              </motion.div>
            )}
          </AnimatePresence>
          </div>

          <DialogFooter
            showCloseButton
            className="!m-0 flex-shrink-0 border-t border-border-light px-6 py-4"
          >
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FormSection({
  title,
  subtitle,
  index,
  children,
}: {
  title: string;
  subtitle?: string;
  index: number;
  children: React.ReactNode;
}) {
  return (
    <motion.section variants={sectionVariants} custom={index}>
      <div className="mb-4 flex items-baseline justify-between border-b border-border-light pb-2">
        <h3 className="text-lg font-bold text-brand">{title}</h3>
        {subtitle && (
          <span className="text-xs text-text-secondary">{subtitle}</span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </motion.section>
  );
}

type FieldName = keyof CreateStudentInput;

function FieldText({
  id,
  label,
  placeholder,
  type = "text",
  required = false,
  register,
  errors,
}: {
  id: FieldName;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  register: UseFormRegister<CreateStudentInput>;
  errors: FieldErrors<CreateStudentInput>;
}) {
  const error = errors[id];
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        aria-invalid={!!error}
        {...register(id)}
      />
      {error && (
        <p className="text-xs text-destructive">{error.message as string}</p>
      )}
    </div>
  );
}

function FieldNumber({
  id,
  label,
  register,
  errors,
}: {
  id: FieldName;
  label: string;
  register: UseFormRegister<CreateStudentInput>;
  errors: FieldErrors<CreateStudentInput>;
}) {
  const error = errors[id];
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={0}
        step="0.01"
        aria-invalid={!!error}
        {...register(id, { valueAsNumber: true })}
      />
      {error && (
        <p className="text-xs text-destructive">{error.message as string}</p>
      )}
    </div>
  );
}
