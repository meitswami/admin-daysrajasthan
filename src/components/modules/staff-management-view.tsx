"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet } from "@/components/ui/sheet";
import { Modal } from "@/components/ui/modal";
import { PageMain, PageToolbar } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import { useSystem } from "@/components/providers/system-provider";
import {
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  PRIMARY_ROLES,
  ROLE_LABELS,
  type PermissionKey,
  type TeamMember,
  type TeamRole,
} from "@/types/rbac";
import {
  createStaffMember,
  listStaffMembers,
  memberEffectivePermissions,
  sendStaffPasswordReset,
  updateStaffMember,
} from "@/lib/rbac/staff-store";
import { getEffectivePermissions } from "@/lib/rbac/permission-overrides";
import { cn } from "@/lib/utils";
import { KeyRound, Pencil, Plus, Search, Shield, UserPlus } from "lucide-react";

export function StaffManagementView() {
  const { show } = useToast();
  const { can, currentMember } = useSystem();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<TeamRole | "">("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [selected, setSelected] = useState<TeamMember | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftRole, setDraftRole] = useState<TeamRole>("sales");
  const [draftActive, setDraftActive] = useState(true);
  const [draftPerms, setDraftPerms] = useState<PermissionKey[]>([]);
  const [useCustomPerms, setUseCustomPerms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<TeamRole>("sales");

  const canManage = can("team.manage");

  const refresh = useCallback(async () => {
    setLoading(true);
    setMembers(await listStaffMembers());
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      const matchQ =
        !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
      const matchRole = !roleFilter || m.role === roleFilter;
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && m.is_active) ||
        (statusFilter === "inactive" && !m.is_active);
      return matchQ && matchRole && matchStatus;
    });
  }, [members, search, roleFilter, statusFilter]);

  function openEdit(member: TeamMember) {
    setSelected(member);
    setDraftName(member.name);
    setDraftRole(member.role);
    setDraftActive(member.is_active);
    const custom = member.permission_overrides != null;
    setUseCustomPerms(custom);
    setDraftPerms(custom ? [...member.permission_overrides!] : getEffectivePermissions(member.role));
  }

  function onRoleChange(role: TeamRole) {
    setDraftRole(role);
    if (!useCustomPerms) {
      setDraftPerms(getEffectivePermissions(role));
    }
  }

  function togglePerm(key: PermissionKey, enabled: boolean) {
    setUseCustomPerms(true);
    setDraftPerms((prev) =>
      enabled ? (prev.includes(key) ? prev : [...prev, key]) : prev.filter((p) => p !== key)
    );
  }

  function applyRolePreset() {
    setUseCustomPerms(false);
    setDraftPerms(getEffectivePermissions(draftRole));
  }

  async function saveMember() {
    if (!selected || !canManage) return;
    setSaving(true);
    const updated = await updateStaffMember(
      selected.id,
      {
        name: draftName,
        role: draftRole,
        is_active: draftActive,
        permission_overrides: useCustomPerms ? draftPerms : null,
      },
      currentMember
    );
    setSaving(false);
    if (updated) {
      show(`Saved ${updated.name}`);
      setSelected(null);
      void refresh();
    } else {
      show("Failed to save — try again");
    }
  }

  async function resetPassword(email: string) {
    setResetting(true);
    const result = await sendStaffPasswordReset(email);
    setResetting(false);
    show(
      result.ok
        ? `Password reset link sent to ${email}`
        : result.error ?? "Could not send reset email"
    );
  }

  async function addMember() {
    if (!canManage) return;
    if (!newName.trim() || !newEmail.trim()) {
      show("Name and email are required");
      return;
    }
    await createStaffMember(
      { name: newName, email: newEmail, role: newRole, is_active: true },
      currentMember
    );
    show(`Added ${newName}`);
    setAddOpen(false);
    setNewName("");
    setNewEmail("");
    setNewRole("sales");
    void refresh();
  }

  if (!canManage) {
    return (
      <>
        <Header title="Staff Management" description="Team roles & access" />
        <PageMain>
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            You need <strong>Team — manage</strong> permission to open Staff Management.
          </p>
        </PageMain>
      </>
    );
  }

  return (
    <>
      <Header
        title="Staff Management"
        description="Manage roles, status, and permissions — cleaner than a dense checkbox grid"
      />
      <PageMain>
        <PageToolbar>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input
              className="h-10 pl-9"
              placeholder="Search name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            className="h-10 w-40"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as TeamRole | "")}
          >
            <option value="">All roles</option>
            {PRIMARY_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
          <Select
            className="h-10 w-36"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSearch("");
              setRoleFilter("");
              setStatusFilter("all");
            }}
          >
            Clear
          </Button>
          <Button type="button" onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4" /> Add staff
          </Button>
        </PageToolbar>

        {loading ? (
          <p className="text-sm text-stone-500">Loading staff…</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
                <tr>
                  <th className="px-4 py-3">Staff</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Access</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((m) => {
                  const perms = memberEffectivePermissions(m);
                  const custom = m.permission_overrides != null;
                  return (
                    <tr key={m.id} className="hover:bg-stone-50/80">
                      <td className="px-4 py-3">
                        <p className="font-medium text-stone-900">{m.name}</p>
                        <p className="text-xs text-stone-500">{m.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="info">{ROLE_LABELS[m.role]}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-stone-700">{perms.length} permissions</p>
                        {custom ? (
                          <p className="text-[11px] text-amber-700">Custom overrides</p>
                        ) : (
                          <p className="text-[11px] text-stone-400">Role preset</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {m.is_active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="default">Inactive</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => openEdit(m)}>
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={resetting}
                            onClick={() => void resetPassword(m.email)}
                          >
                            <KeyRound className="h-3.5 w-3.5" /> Reset pwd
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-stone-500">
                      No staff match your filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </PageMain>

      <Sheet
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `Edit ${selected.name}` : "Edit staff"}
        className="!max-w-lg"
      >
        {selected && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
              <div>
                <Label>Name</Label>
                <Input
                  className="mt-1.5"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input className="mt-1.5" value={selected.email} disabled />
                <p className="mt-1 text-xs text-stone-500">Email is the login ID — use password reset to change access.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Role</Label>
                  <Select
                    className="mt-1.5"
                    value={draftRole}
                    onChange={(e) => onRoleChange(e.target.value as TeamRole)}
                  >
                    {PRIMARY_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    className="mt-1.5"
                    value={draftActive ? "active" : "inactive"}
                    onChange={(e) => setDraftActive(e.target.value === "active")}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Select>
                </div>
              </div>

              <div className="rounded-xl border border-stone-100 bg-stone-50 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-semibold text-stone-800">
                    <Shield className="h-4 w-4 text-amber-600" />
                    Permissions
                  </p>
                  <Button type="button" size="sm" variant="outline" onClick={applyRolePreset}>
                    Reset to role preset
                  </Button>
                </div>
                <p className="mb-3 text-xs text-stone-500">
                  {useCustomPerms
                    ? "Custom overrides for this person (saved separately from the role matrix)."
                    : `Using ${ROLE_LABELS[draftRole]} preset. Toggle any box to customize.`}
                </p>

                <div className="space-y-4">
                  {PERMISSION_GROUPS.map((group) => (
                    <div key={group.id}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                        {group.label}
                      </p>
                      <div className="space-y-1.5">
                        {group.keys.map((key) => {
                          const on = draftPerms.includes(key);
                          return (
                            <label
                              key={key}
                              className={cn(
                                "flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 text-sm transition-colors",
                                on
                                  ? "border-amber-200 bg-amber-50/60"
                                  : "border-transparent bg-white hover:border-stone-200"
                              )}
                            >
                              <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 rounded border-stone-300"
                                checked={on}
                                onChange={(e) => togglePerm(key, e.target.checked)}
                              />
                              <span>
                                <span className="font-medium text-stone-800">
                                  {PERMISSION_LABELS[key]}
                                </span>
                                <span className="mt-0.5 block font-mono text-[10px] text-stone-400">
                                  {key}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 border-t border-stone-100 px-4 py-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setSelected(null)}>
                Cancel
              </Button>
              <Button type="button" className="flex-1" disabled={saving} onClick={() => void saveMember()}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        )}
      </Sheet>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add staff member">
        <div className="space-y-4">
          <div>
            <Label>Full name *</Label>
            <Input className="mt-1.5" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <div>
            <Label>Email *</Label>
            <Input
              className="mt-1.5"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="name@company.com"
            />
          </div>
          <div>
            <Label>Role</Label>
            <Select
              className="mt-1.5"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as TeamRole)}
            >
              {PRIMARY_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </div>
          <p className="text-xs text-stone-500">
            After adding, use <strong>Reset pwd</strong> so they receive a secure password link. We never store or show plaintext passwords.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void addMember()}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
