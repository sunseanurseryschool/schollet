"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  PlusIcon,
  SearchIcon,
  PencilIcon,
  UserXIcon,
  UserCheckIcon,
  MoreHorizontalIcon,
  MailIcon,
  BriefcaseIcon,
  IndianRupeeIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { StaffFormDialog } from "@/components/staff/staff-form-dialog";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/ui/animated";

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
  created_at: string;
  updated_at: string;
  role?: Role | null;
}

interface StaffListResult {
  staff: StaffMember[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Staff Card ───────────────────────────────────────────────────────────────

interface StaffCardProps {
  member: StaffMember;
  onEdit: (member: StaffMember) => void;
  onActivate: (member: StaffMember) => void;
  onDeactivate: (member: StaffMember) => void;
  index: number;
}

function StaffCard({ member, onEdit, onActivate, onDeactivate, index }: StaffCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{
        y: -3,
        boxShadow: "0 12px 40px -10px rgba(0,0,0,0.12), 0 4px 16px -4px rgba(0,0,0,0.06)",
        transition: { duration: 0.2, ease: "easeOut" },
      }}
      className="relative rounded-xl border bg-surface p-5 flex flex-col gap-4 overflow-hidden"
    >
      {/* Active / inactive accent bar */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
        animate={{ backgroundColor: member.is_active ? "#16A34A" : "#94A3B8" }}
        transition={{ duration: 0.4 }}
      />

      {/* Header row */}
      <div className="flex items-start justify-between gap-2 pt-1">
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="font-semibold text-text-primary truncate">{member.name}</p>
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <MailIcon className="h-3 w-3 shrink-0" />
            <span className="truncate">{member.email}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusBadge variant={member.is_active ? "active" : "inactive"} />

          {member.role?.name !== "Admin" && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label={`Actions for ${member.name}`}
                  />
                }
              >
                <MoreHorizontalIcon className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(member)}>
                  <PencilIcon className="h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {member.is_active ? (
                  <DropdownMenuItem variant="destructive" onClick={() => onDeactivate(member)}>
                    <UserXIcon className="h-4 w-4" />
                    Deactivate
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onActivate(member)}>
                    <UserCheckIcon className="h-4 w-4 text-emerald-600" />
                    Activate
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Role + Salary */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <BriefcaseIcon className="h-3.5 w-3.5 text-text-secondary" />
          {member.role?.name ? (
            <Badge variant="secondary" className="text-xs">{member.role.name}</Badge>
          ) : (
            <span className="text-xs text-text-tertiary italic">No role</span>
          )}
        </div>
        <div className="flex items-center gap-1 text-sm font-semibold text-text-primary">
          <IndianRupeeIcon className="h-3.5 w-3.5 text-text-secondary" />
          {member.salary > 0
            ? member.salary.toLocaleString("en-IN")
            : <span className="text-text-tertiary font-normal text-xs">—</span>}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function StaffList() {
  const [result, setResult] = React.useState<StaffListResult | null>(null);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string>("");
  const [activeFilter, setActiveFilter] = React.useState<string>("");
  const [page, setPage] = React.useState(1);

  const debouncedSearch = useDebounce(search, 350);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editingStaff, setEditingStaff] = React.useState<StaffMember | null>(null);
  const [deactivateTarget, setDeactivateTarget] = React.useState<StaffMember | null>(null);
  const [isDeactivating, setIsDeactivating] = React.useState(false);

  React.useEffect(() => {
    async function loadRoles() {
      try {
        const res = await fetch("/api/roles");
        if (res.ok) setRoles((await res.json()) as Role[]);
      } catch {
        // non-critical
      }
    }
    void loadRoles();
  }, []);

  const fetchStaff = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (roleFilter) params.set("role_id", roleFilter);
      if (activeFilter) params.set("is_active", activeFilter);
      params.set("page", String(page));
      params.set("per_page", "20");

      const res = await fetch(`/api/staff?${params.toString()}`);
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to load staff");
      }
      setResult((await res.json()) as StaffListResult);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load staff");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, roleFilter, activeFilter, page]);

  React.useEffect(() => {
    void fetchStaff();
  }, [fetchStaff]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, activeFilter]);

  function handleAddStaff() {
    setEditingStaff(null);
    setFormOpen(true);
  }

  function handleEditStaff(staff: StaffMember) {
    setEditingStaff(staff);
    setFormOpen(true);
  }

  async function handleActivate(staff: StaffMember) {
    try {
      const res = await fetch(`/api/staff/${staff.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: true }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Activation failed");
      }
      toast.success(`${staff.name} has been activated`);
      void fetchStaff();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Activation failed");
    }
  }

  function handleDeactivateClick(staff: StaffMember) {
    setDeactivateTarget(staff);
  }

  async function handleDeactivateConfirm() {
    if (!deactivateTarget) return;
    setIsDeactivating(true);
    try {
      const res = await fetch(`/api/staff/${deactivateTarget.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Deactivation failed");
      }
      toast.success(`${deactivateTarget.name} has been deactivated`);
      setDeactivateTarget(null);
      void fetchStaff();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Deactivation failed");
    } finally {
      setIsDeactivating(false);
    }
  }

  function clearFilters() {
    setSearch("");
    setRoleFilter("");
    setActiveFilter("");
    setPage(1);
  }

  const hasFilters = search || roleFilter || activeFilter;

  return (
    <PageTransition>
      <div className="flex flex-col gap-4">
        {/* Toolbar */}
        <div
          className="rounded-2xl border border-white/60 bg-surface/70 px-4 py-3 shadow-sm backdrop-blur-md"
          style={{ WebkitBackdropFilter: "blur(12px)" }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
              <Input
                placeholder="Search name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 transition-all duration-200 focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>

            <Select value={roleFilter || "__all__"} onValueChange={(val) => setRoleFilter(val == null || val === "__all__" ? "" : val)}>
              <SelectTrigger className="w-[140px] transition-all duration-200 focus:ring-2 focus:ring-brand/30 focus:border-brand">
                <span>{roleFilter ? roles.find((r) => r.id === roleFilter)?.name ?? roleFilter : "All Roles"}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Roles</SelectItem>
                {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={activeFilter || "__all__"} onValueChange={(val) => setActiveFilter(val == null || val === "__all__" ? "" : val)}>
              <SelectTrigger className="w-[130px] transition-all duration-200 focus:ring-2 focus:ring-brand/30 focus:border-brand">
                <span>{activeFilter === "true" ? "Active" : activeFilter === "false" ? "Inactive" : "All Status"}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>
            )}
          </div>

          {/* Gradient Add Staff button */}
          <Button
            onClick={handleAddStaff}
            className="shrink-0 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1e40af] text-white shadow-md shadow-blue-500/20 border-0"
          >
            <PlusIcon className="h-4 w-4" />
            Add Staff
          </Button>
          </div>
        </div>

        {result && (
          <p className="text-sm text-text-secondary">
            {result.total === 0
              ? "No staff found"
              : `Showing ${result.staff.length} of ${result.total} staff member${result.total !== 1 ? "s" : ""}`}
          </p>
        )}

        {/* Card grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-surface p-5 flex flex-col gap-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : result?.staff.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border bg-surface p-12 text-center text-text-secondary text-sm"
          >
            {hasFilters
              ? "No staff match the current filters."
              : "No staff added yet. Click \"Add Staff\" to get started."}
          </motion.div>
        ) : (
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {[...(result?.staff ?? [])].sort((a, b) => {
                if (a.role?.name === "Admin" && b.role?.name !== "Admin") return -1;
                if (a.role?.name !== "Admin" && b.role?.name === "Admin") return 1;
                return 0;
              }).map((member, i) => (
                <StaffCard
                  key={member.id}
                  member={member}
                  onEdit={handleEditStaff}
                  onActivate={handleActivate}
                  onDeactivate={handleDeactivateClick}
                  index={i}
                />
              ))}
            </AnimatePresence>
          </StaggerContainer>
        )}

        {/* Pagination */}
        {result && result.total_pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-secondary">Page {result.page} of {result.total_pages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= result.total_pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}

        {/* Add/Edit Dialog */}
        <StaffFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          staff={editingStaff}
          roles={roles}
          onSuccess={() => void fetchStaff()}
        />

        {/* Deactivate Confirmation Dialog */}
        <Dialog
          open={deactivateTarget != null}
          onOpenChange={(open) => { if (!open) setDeactivateTarget(null); }}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Deactivate Staff Member</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-text-secondary">
              Are you sure you want to deactivate{" "}
              <span className="font-semibold text-text-primary">{deactivateTarget?.name}</span>? They
              will no longer be able to log in.
            </p>
            <DialogFooter>
              <Button variant="destructive" disabled={isDeactivating} onClick={handleDeactivateConfirm}>
                {isDeactivating ? "Deactivating..." : "Deactivate"}
              </Button>
              <Button variant="outline" disabled={isDeactivating} onClick={() => setDeactivateTarget(null)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
