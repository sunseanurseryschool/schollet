"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { PlusIcon, PencilIcon, Trash2Icon, ShieldCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/ui/animated";

interface Permission {
  id: string;
  code: string;
  description: string;
}

interface RoleWithPermissions {
  id: string;
  name: string;
  created_at: string;
  permissions: Permission[];
}

interface RoleFormState {
  name: string;
  permission_ids: string[];
}

// ─── Animated permission checkbox ────────────────────────────────────────────

interface PermissionCheckboxProps {
  perm: Permission;
  checked: boolean;
  onToggle: (id: string) => void;
  idPrefix: string;
  index: number;
}

function PermissionCheckbox({ perm, checked, onToggle, idPrefix, index }: PermissionCheckboxProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04, ease: "easeOut" }}
      className="flex items-start gap-2.5 rounded-lg p-2 hover:bg-surface-secondary transition-colors"
    >
      <Checkbox
        id={`${idPrefix}-${perm.id}`}
        checked={checked}
        onCheckedChange={() => onToggle(perm.id)}
        className="mt-0.5"
      />
      <div className="grid gap-0.5 min-w-0">
        <Label
          htmlFor={`${idPrefix}-${perm.id}`}
          className="text-sm font-medium cursor-pointer font-mono text-brand"
        >
          {perm.code}
        </Label>
        {perm.description && (
          <p className="text-xs text-text-secondary leading-snug">{perm.description}</p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Role form fields (used in both create + edit dialogs) ────────────────────

interface RoleFormFieldsProps {
  nameValue: string;
  nameError: string;
  onNameChange: (val: string) => void;
  allPermissions: Permission[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  idPrefix: string;
  open: boolean;
}

function RoleFormFields({
  nameValue,
  nameError,
  onNameChange,
  allPermissions,
  selectedIds,
  onToggle,
  idPrefix,
  open,
}: RoleFormFieldsProps) {
  return (
    <div className="grid gap-4 py-2">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={open ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="grid gap-1.5"
      >
        <Label htmlFor={`${idPrefix}-name`}>
          Role Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`${idPrefix}-name`}
          placeholder="e.g. Accountant"
          value={nameValue}
          onChange={(e) => onNameChange(e.target.value)}
          aria-invalid={!!nameError}
        />
        {nameError && <p className="text-xs text-destructive">{nameError}</p>}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={open ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ duration: 0.3, delay: 0.07, ease: "easeOut" }}
        className="grid gap-2"
      >
        <Label>Permissions</Label>
        <div className="rounded-lg border p-2 grid gap-0.5 max-h-60 overflow-y-auto bg-surface-secondary">
          {allPermissions.map((perm, i) => (
            <PermissionCheckbox
              key={perm.id}
              perm={perm}
              checked={selectedIds.includes(perm.id)}
              onToggle={onToggle}
              idPrefix={idPrefix}
              index={i}
            />
          ))}
        </div>
        <p className="text-xs text-text-secondary">
          {selectedIds.length} of {allPermissions.length} selected
        </p>
      </motion.div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RolesPermissionsManager() {
  const [roles, setRoles] = React.useState<RoleWithPermissions[]>([]);
  const [allPermissions, setAllPermissions] = React.useState<Permission[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<RoleFormState>({ name: "", permission_ids: [] });
  const [createNameError, setCreateNameError] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);

  const [editTarget, setEditTarget] = React.useState<RoleWithPermissions | null>(null);
  const [editForm, setEditForm] = React.useState<RoleFormState>({ name: "", permission_ids: [] });
  const [editNameError, setEditNameError] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  const [deleteTarget, setDeleteTarget] = React.useState<RoleWithPermissions | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  async function loadData() {
    setIsLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([fetch("/api/roles"), fetch("/api/permissions")]);
      if (!rolesRes.ok || !permsRes.ok) throw new Error("Failed to load data");
      const [rolesData, permsData] = await Promise.all([
        rolesRes.json() as Promise<RoleWithPermissions[]>,
        permsRes.json() as Promise<Permission[]>,
      ]);
      setRoles(rolesData);
      setAllPermissions(permsData);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  }

  React.useEffect(() => {
    void loadData();
  }, []);

  function openCreateDialog() {
    setCreateForm({ name: "", permission_ids: [] });
    setCreateNameError("");
    setCreateOpen(true);
  }

  function toggleCreatePermission(permId: string) {
    setCreateForm((prev) => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(permId)
        ? prev.permission_ids.filter((id) => id !== permId)
        : [...prev.permission_ids, permId],
    }));
  }

  async function handleCreate() {
    if (!createForm.name.trim()) { setCreateNameError("Role name is required"); return; }
    if (createForm.name.trim().toLowerCase() === "admin") { setCreateNameError("Cannot create a role named \"Admin\""); return; }
    setCreateNameError("");
    setIsCreating(true);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createForm.name.trim(), permission_ids: createForm.permission_ids }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to create role");
      }
      toast.success("Role created successfully");
      setCreateOpen(false);
      void loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create role");
    } finally {
      setIsCreating(false);
    }
  }

  function openEditDialog(role: RoleWithPermissions) {
    setEditTarget(role);
    setEditForm({ name: role.name, permission_ids: role.permissions.map((p) => p.id) });
    setEditNameError("");
  }

  function toggleEditPermission(permId: string) {
    setEditForm((prev) => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(permId)
        ? prev.permission_ids.filter((id) => id !== permId)
        : [...prev.permission_ids, permId],
    }));
  }

  async function handleSaveEdit() {
    if (!editTarget) return;
    if (!editForm.name.trim()) { setEditNameError("Role name is required"); return; }
    if (editForm.name.trim().toLowerCase() === "admin") { setEditNameError("Cannot use the name \"Admin\""); return; }
    setEditNameError("");
    setIsSaving(true);
    try {
      const res = await fetch(`/api/roles/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editForm.name.trim(), permission_ids: editForm.permission_ids }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to update role");
      }
      toast.success("Role updated successfully");
      setEditTarget(null);
      void loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/roles/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to delete role");
      }
      toast.success(`Role "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      void loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete role");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <PageTransition>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Roles &amp; Permissions</h2>
            <p className="text-sm text-text-secondary">Manage roles and the permissions assigned to each.</p>
          </div>
          <Button
            onClick={openCreateDialog}
            className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1e40af] text-white border-0 shadow-md shadow-blue-500/20"
          >
            <PlusIcon className="h-4 w-4" />
            New Role
          </Button>
        </div>

        {/* Roles list */}
        <div className="flex flex-col gap-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl ring-1 ring-foreground/10 bg-surface p-4">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-64" />
              </div>
            ))
          ) : roles.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl ring-1 ring-foreground/10 bg-surface p-8 text-center text-sm text-text-secondary"
            >
              No roles created yet. Click &quot;New Role&quot; to get started.
            </motion.div>
          ) : (
            <StaggerContainer className="flex flex-col gap-3">
              {roles.map((role) => (
                <StaggerItem key={role.id}>
                  <motion.div
                    whileHover={{
                      y: -1,
                      boxShadow: "0 4px 20px -4px rgba(0,0,0,0.08)",
                      transition: { duration: 0.2 },
                    }}
                    className="rounded-xl ring-1 ring-foreground/10 bg-surface p-4 flex items-start justify-between gap-4"
                  >
                    <div className="flex flex-col gap-2.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <ShieldCheckIcon className="h-4 w-4 text-brand shrink-0" />
                        <p className="font-semibold text-text-primary">{role.name}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {role.permissions.length === 0 ? (
                          <span className="text-xs text-text-secondary italic">No permissions assigned</span>
                        ) : (
                          role.permissions.map((p) => (
                            <motion.div
                              key={p.id}
                              initial={{ opacity: 0, scale: 0.85 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Badge variant="secondary" className="text-xs font-mono">{p.code}</Badge>
                            </motion.div>
                          ))
                        )}
                      </div>
                    </div>
                    {role.name !== "Admin" && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(role)}
                          aria-label={`Edit ${role.name}`}
                        >
                          <PencilIcon className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(role)}
                          aria-label={`Delete ${role.name}`}
                        >
                          <Trash2Icon className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </motion.div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>

        {/* Create Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Role</DialogTitle>
            </DialogHeader>
            <RoleFormFields
              nameValue={createForm.name}
              nameError={createNameError}
              onNameChange={(val) => { setCreateForm((prev) => ({ ...prev, name: val })); if (createNameError) setCreateNameError(""); }}
              allPermissions={allPermissions}
              selectedIds={createForm.permission_ids}
              onToggle={toggleCreatePermission}
              idPrefix="create-perm"
              open={createOpen}
            />
            <DialogFooter showCloseButton>
              <Button
                onClick={handleCreate}
                disabled={isCreating}
                className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1e40af] text-white border-0"
              >
                {isCreating ? "Creating..." : "Create Role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog
          open={editTarget != null}
          onOpenChange={(open) => { if (!open) setEditTarget(null); }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Role</DialogTitle>
            </DialogHeader>
            <RoleFormFields
              nameValue={editForm.name}
              nameError={editNameError}
              onNameChange={(val) => { setEditForm((prev) => ({ ...prev, name: val })); if (editNameError) setEditNameError(""); }}
              allPermissions={allPermissions}
              selectedIds={editForm.permission_ids}
              onToggle={toggleEditPermission}
              idPrefix="edit-perm"
              open={editTarget != null}
            />
            <DialogFooter showCloseButton>
              <Button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] hover:from-[#1D4ED8] hover:to-[#1e40af] text-white border-0"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteTarget != null}
          onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Role</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-text-secondary">
              Are you sure you want to delete the role{" "}
              <span className="font-semibold text-text-primary">{deleteTarget?.name}</span>? This cannot
              be undone. Roles assigned to active staff cannot be deleted.
            </p>
            <DialogFooter>
              <Button variant="destructive" disabled={isDeleting} onClick={handleDeleteConfirm}>
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
              <Button variant="outline" disabled={isDeleting} onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
