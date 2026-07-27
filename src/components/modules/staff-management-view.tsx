"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet } from "@/components/ui/sheet";
import { Modal } from "@/components/ui/modal";
import { PageMain, PageToolbar, TableRowActions } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import { useSystem } from "@/components/providers/system-provider";
import {
  PERMISSION_GROUPS as PERMISSION_UI_GROUPS,
  PERMISSION_LABELS,
  PRIMARY_ROLES,
  ROLE_LABELS,
  type PermissionKey,
  type StaffPermissionGroup,
  type TeamMember,
  type TeamRole,
} from "@/types/rbac";
import {
  createPermissionGroup,
  listPermissionGroups,
  updatePermissionGroup,
} from "@/lib/rbac/permission-groups-store";
import {
  createStaffMember,
  deleteStaffMember,
  findStaffByEmail,
  listStaffMembers,
  memberEffectivePermissions,
  sendStaffPasswordReset,
  updateStaffCredentials,
  updateStaffMember,
} from "@/lib/rbac/staff-store";
import { SEED_PERMISSION_GROUP_ID } from "@/lib/rbac/staff-seed";
import { getEffectivePermissions } from "@/lib/rbac/permission-overrides";
import { cn } from "@/lib/utils";
import { Toggle } from "@/components/ui/toggle";
import { KeyRound, Pencil, Plus, Search, Shield, Trash2, UserPlus, Users } from "lucide-react";

function resolveDraftPermissions(
  role: TeamRole,
  groupId: string | null,
  groups: StaffPermissionGroup[],
  custom: boolean,
  customPerms: PermissionKey[]
): PermissionKey[] {
  if (custom) return customPerms;
  const group = groups.find((g) => g.id === groupId);
  if (group) return [...group.permissions];
  return getEffectivePermissions(role);
}

export function StaffManagementView() {
  const { show } = useToast();
  const { can, currentMember } = useSystem();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [permGroups, setPermGroups] = useState<StaffPermissionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<TeamRole | "">("");
  const [groupFilter, setGroupFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [selected, setSelected] = useState<TeamMember | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftRole, setDraftRole] = useState<TeamRole>("staff");
  const [draftGroupId, setDraftGroupId] = useState<string | null>(null);
  const [draftActive, setDraftActive] = useState(true);
  const [draftPerms, setDraftPerms] = useState<PermissionKey[]>([]);
  const [useCustomPerms, setUseCustomPerms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [credentialsTarget, setCredentialsTarget] = useState<TeamMember | null>(null);
  const [credEmail, setCredEmail] = useState("");
  const [credPassword, setCredPassword] = useState("");
  const [credConfirm, setCredConfirm] = useState("");
  const [credSaving, setCredSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<TeamRole>("staff");
  const [newGroupId, setNewGroupId] = useState<string | null>(SEED_PERMISSION_GROUP_ID);

  const [editGroup, setEditGroup] = useState<StaffPermissionGroup | null>(null);
  const [groupDraftName, setGroupDraftName] = useState("");
  const [groupDraftDesc, setGroupDraftDesc] = useState("");
  const [groupDraftPerms, setGroupDraftPerms] = useState<PermissionKey[]>([]);
  const [groupSaving, setGroupSaving] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const canManage = can("team.manage");
  const isSuperAdmin = currentMember.role === "superadmin";

  const credEmailDuplicate = useMemo(() => {
    if (!credentialsTarget || !credEmail.trim()) return null;
    return findStaffByEmail(members, credEmail, credentialsTarget.id) ?? null;
  }, [credentialsTarget, credEmail, members]);

  const newEmailDuplicate = useMemo(() => {
    if (!newEmail.trim()) return null;
    return findStaffByEmail(members, newEmail) ?? null;
  }, [members, newEmail]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [staff, groups] = await Promise.all([listStaffMembers(), listPermissionGroups()]);
    setMembers(staff);
    setPermGroups(groups);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const groupById = useMemo(
    () => new Map(permGroups.map((g) => [g.id, g])),
    [permGroups]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      const matchQ =
        !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
      const matchRole = !roleFilter || m.role === roleFilter;
      const matchGroup = !groupFilter || m.permission_group_id === groupFilter;
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && m.is_active) ||
        (statusFilter === "inactive" && !m.is_active);
      return matchQ && matchRole && matchGroup && matchStatus;
    });
  }, [members, search, roleFilter, groupFilter, statusFilter]);

  function openEdit(member: TeamMember) {
    setSelected(member);
    setDraftName(member.name);
    setDraftRole(member.role);
    setDraftGroupId(member.permission_group_id ?? null);
    setDraftActive(member.is_active);
    const custom = member.permission_overrides != null;
    setUseCustomPerms(custom);
    setDraftPerms(
      resolveDraftPermissions(
        member.role,
        member.permission_group_id ?? null,
        permGroups,
        custom,
        custom ? [...member.permission_overrides!] : []
      )
    );
  }

  function onRoleChange(role: TeamRole) {
    setDraftRole(role);
    if (!useCustomPerms) {
      setDraftPerms(resolveDraftPermissions(role, draftGroupId, permGroups, false, []));
    }
  }

  function onGroupChange(groupId: string | null) {
    setDraftGroupId(groupId);
    if (!useCustomPerms) {
      setDraftPerms(resolveDraftPermissions(draftRole, groupId, permGroups, false, []));
    }
  }

  function togglePerm(key: PermissionKey, enabled: boolean) {
    setUseCustomPerms(true);
    setDraftPerms((prev) =>
      enabled ? (prev.includes(key) ? prev : [...prev, key]) : prev.filter((p) => p !== key)
    );
  }

  function toggleGroupPerm(key: PermissionKey, enabled: boolean) {
    setGroupDraftPerms((prev) =>
      enabled ? (prev.includes(key) ? prev : [...prev, key]) : prev.filter((p) => p !== key)
    );
  }

  function applyGroupOrRolePreset() {
    setUseCustomPerms(false);
    setDraftPerms(resolveDraftPermissions(draftRole, draftGroupId, permGroups, false, []));
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
        permission_group_id: draftGroupId,
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

  async function toggleMemberActive(member: TeamMember, active: boolean) {
    if (!canManage) return;
    const updated = await updateStaffMember(
      member.id,
      { is_active: active },
      currentMember
    );
    if (updated) {
      show(active ? `${member.name} marked active` : `${member.name} marked inactive`);
      void refresh();
    } else {
      show("Failed to update status");
    }
  }

  function openCredentials(member: TeamMember) {
    setCredentialsTarget(member);
    setCredEmail(member.email);
    setCredPassword("");
    setCredConfirm("");
  }

  function closeCredentials() {
    setCredentialsTarget(null);
    setCredEmail("");
    setCredPassword("");
    setCredConfirm("");
  }

  async function saveCredentials() {
    if (!credentialsTarget || !canManage) return;
    const email = credEmail.trim().toLowerCase();
    if (!email) {
      show("Email is required");
      return;
    }
    if (credEmailDuplicate) {
      show(`Email already used by ${credEmailDuplicate.name}`);
      return;
    }
    if (credPassword && credPassword.length < 8) {
      show("Password must be at least 8 characters");
      return;
    }
    if (credPassword && credPassword !== credConfirm) {
      show("Passwords do not match");
      return;
    }
    const emailChanged = email !== credentialsTarget.email.toLowerCase();
    if (!emailChanged && !credPassword) {
      show("Change the email or enter a new password");
      return;
    }

    setCredSaving(true);
    const result = await updateStaffCredentials(
      credentialsTarget.id,
      {
        email,
        password: credPassword || undefined,
      },
      currentMember
    );
    setCredSaving(false);

    if (!result.ok) {
      show(result.error ?? "Could not update credentials");
      return;
    }

    const parts: string[] = [];
    if (result.password_set) parts.push("password updated");
    if (result.email_changed) parts.push("email updated");
    show(
      parts.length
        ? `Saved for ${credentialsTarget.name}: ${parts.join(" & ")}`
        : `Saved credentials for ${credentialsTarget.name}`
    );
    closeCredentials();
    void refresh();
  }

  async function sendResetLink() {
    if (!credentialsTarget) return;
    setResetting(true);
    const result = await sendStaffPasswordReset(credentialsTarget.email);
    setResetting(false);
    show(
      result.ok
        ? `Password reset link sent to ${credentialsTarget.email}`
        : result.error ?? "Could not send reset email"
    );
  }

  async function confirmDelete() {
    if (!deleteTarget || !canManage) return;
    setDeleting(true);
    const result = await deleteStaffMember(deleteTarget.id, currentMember);
    setDeleting(false);
    if (result.ok) {
      show(`Deleted ${deleteTarget.name}`);
      if (selected?.id === deleteTarget.id) setSelected(null);
      setDeleteTarget(null);
      void refresh();
    } else {
      show(result.error ?? "Could not delete staff member");
    }
  }

  async function addMember() {
    if (!canManage) return;
    if (!newName.trim() || !newEmail.trim()) {
      show("Name and email are required");
      return;
    }
    if (newEmailDuplicate) {
      show(`Email already used by ${newEmailDuplicate.name}`);
      return;
    }
    const result = await createStaffMember(
      {
        name: newName,
        email: newEmail,
        role: newRole,
        is_active: true,
        permission_group_id: newGroupId,
      },
      currentMember
    );
    if (!result.ok) {
      show(result.error);
      return;
    }
    show(`Added ${result.member.name}`);
    setAddOpen(false);
    setNewName("");
    setNewEmail("");
    setNewRole("staff");
    setNewGroupId(SEED_PERMISSION_GROUP_ID);
    void refresh();
  }

  function openGroupEdit(group: StaffPermissionGroup) {
    setEditGroup(group);
    setGroupDraftName(group.name);
    setGroupDraftDesc(group.description ?? "");
    setGroupDraftPerms([...group.permissions]);
  }

  async function saveGroup() {
    if (!editGroup) return;
    setGroupSaving(true);
    const updated = await updatePermissionGroup(editGroup.id, {
      name: groupDraftName,
      description: groupDraftDesc,
      permissions: groupDraftPerms,
    });
    setGroupSaving(false);
    if (updated) {
      show(`Updated group ${updated.name}`);
      setEditGroup(null);
      void refresh();
    } else {
      show("Failed to save group");
    }
  }

  async function createGroup() {
    if (!newGroupName.trim()) {
      show("Group name is required");
      return;
    }
    await createPermissionGroup({
      name: newGroupName,
      permissions: getEffectivePermissions("staff"),
    });
    show(`Created group ${newGroupName}`);
    setCreateGroupOpen(false);
    setNewGroupName("");
    void refresh();
  }

  function accessLabel(member: TeamMember) {
    if (member.permission_overrides != null) return "Custom overrides";
    if (member.permission_group_id) {
      return groupById.get(member.permission_group_id)?.name ?? "Permission group";
    }
    return "Role preset";
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
        description="Manage staff, permission groups, and access"
      />
      <PageMain>
        <section className="mb-6 rounded-xl border border-stone-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-stone-900">
              <Users className="h-4 w-4 text-amber-600" />
              Permission groups
            </p>
            <Button type="button" size="sm" variant="outline" onClick={() => setCreateGroupOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> New group
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {permGroups.map((g) => {
              const memberCount = members.filter((m) => m.permission_group_id === g.id).length;
              return (
                <div
                  key={g.id}
                  className="rounded-lg border border-stone-100 bg-stone-50/80 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-stone-900">{g.name}</p>
                      {g.description && (
                        <p className="mt-0.5 text-xs text-stone-500">{g.description}</p>
                      )}
                      <p className="mt-2 text-xs text-stone-600">
                        {g.permissions.length} permissions · {memberCount} member
                        {memberCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => openGroupEdit(g)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

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
            className="h-10 w-44"
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
          >
            <option value="">All groups</option>
            {permGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
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
            <option value="staff">{ROLE_LABELS.staff}</option>
            <option value="operations">{ROLE_LABELS.operations}</option>
            <option value="accounts">{ROLE_LABELS.accounts}</option>
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
              setGroupFilter("");
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
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
                <tr>
                  <th className="px-4 py-3">Staff</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Permission group</th>
                  <th className="px-4 py-3">Access</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((m) => {
                  const perms = memberEffectivePermissions(m);
                  const groupName = m.permission_group_id
                    ? groupById.get(m.permission_group_id)?.name
                    : null;
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
                        {groupName ? (
                          <Badge variant="default">{groupName}</Badge>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-stone-700">{perms.length} permissions</p>
                        <p
                          className={cn(
                            "text-[11px]",
                            m.permission_overrides != null
                              ? "text-amber-700"
                              : m.permission_group_id
                                ? "text-sky-700"
                                : "text-stone-400"
                          )}
                        >
                          {accessLabel(m)}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <TableRowActions>
                          <Toggle
                            checked={m.is_active}
                            onChange={(v) => void toggleMemberActive(m, v)}
                          />
                          <Button type="button" size="sm" variant="ghost" className="shrink-0" onClick={() => openEdit(m)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="shrink-0"
                            onClick={() => openCredentials(m)}
                            title="Reset password"
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="shrink-0"
                            disabled={m.id === currentMember.id}
                            title={
                              m.id === currentMember.id
                                ? "You cannot delete your own account"
                                : `Delete ${m.name}`
                            }
                            onClick={() => setDeleteTarget(m)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableRowActions>
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
                <p className="mt-1 text-xs text-stone-500">
                  To change login email or password, use <strong>Reset pwd</strong>.
                </p>
              </div>
              <div>
                <Label>Permission group</Label>
                <Select
                  className="mt-1.5"
                  value={draftGroupId ?? ""}
                  onChange={(e) => onGroupChange(e.target.value || null)}
                >
                  <option value="">None — use role preset</option>
                  {permGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-xs text-stone-500">
                  Everyone in the same group gets identical permissions. Edit the group above to
                  change access for all members at once.
                </p>
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
                    <option value="staff">{ROLE_LABELS.staff}</option>
                    <option value="operations">{ROLE_LABELS.operations}</option>
                    <option value="accounts">{ROLE_LABELS.accounts}</option>
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
                  <Button type="button" size="sm" variant="outline" onClick={applyGroupOrRolePreset}>
                    Reset to {draftGroupId ? "group" : "role"} preset
                  </Button>
                </div>
                <p className="mb-3 text-xs text-stone-500">
                  {useCustomPerms
                    ? "Custom overrides for this person only."
                    : draftGroupId
                      ? `Using ${groupById.get(draftGroupId)?.name ?? "group"} preset. Toggle any box to customize.`
                      : `Using ${ROLE_LABELS[draftRole]} preset. Toggle any box to customize.`}
                </p>

                <div className="space-y-4">
                  {PERMISSION_UI_GROUPS.map((group) => (
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

      <Sheet
        open={Boolean(editGroup)}
        onClose={() => setEditGroup(null)}
        title={editGroup ? `Edit group — ${editGroup.name}` : "Edit group"}
        className="!max-w-lg"
      >
        {editGroup && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <div>
                <Label>Group name</Label>
                <Input
                  className="mt-1.5"
                  value={groupDraftName}
                  onChange={(e) => setGroupDraftName(e.target.value)}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  className="mt-1.5"
                  value={groupDraftDesc}
                  onChange={(e) => setGroupDraftDesc(e.target.value)}
                />
              </div>
              <p className="text-xs text-stone-500">
                Changes apply to all {members.filter((m) => m.permission_group_id === editGroup.id).length}{" "}
                members in this group (unless they have custom overrides).
              </p>
              <div className="space-y-4">
                {PERMISSION_UI_GROUPS.map((group) => (
                  <div key={group.id}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                      {group.label}
                    </p>
                    <div className="space-y-1.5">
                      {group.keys.map((key) => {
                        const on = groupDraftPerms.includes(key);
                        return (
                          <label
                            key={key}
                            className={cn(
                              "flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 text-sm",
                              on ? "border-sky-200 bg-sky-50/60" : "border-transparent bg-white"
                            )}
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5 h-4 w-4 rounded border-stone-300"
                              checked={on}
                              onChange={(e) => toggleGroupPerm(key, e.target.checked)}
                            />
                            <span className="font-medium text-stone-800">
                              {PERMISSION_LABELS[key]}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 border-t border-stone-100 px-4 py-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditGroup(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={groupSaving}
                onClick={() => void saveGroup()}
              >
                {groupSaving ? "Saving…" : "Save group"}
              </Button>
            </div>
          </div>
        )}
      </Sheet>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Delete staff member"
        description={
          deleteTarget
            ? `Remove ${deleteTarget.name} (${deleteTarget.email}) from Staff Management? This cannot be undone.`
            : undefined
        }
      >
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={deleting}
            onClick={() => setDeleteTarget(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={() => void confirmDelete()}
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(credentialsTarget)}
        onClose={() => {
          if (!credSaving && !resetting) closeCredentials();
        }}
        title={
          credentialsTarget
            ? `Login access — ${credentialsTarget.name}`
            : "Login access"
        }
        description="Set a new password here, or update the login email."
      >
        {credentialsTarget && (
          <div className="space-y-4">
            <div>
              <Label>Login email</Label>
              <Input
                className="mt-1.5"
                type="email"
                value={credEmail}
                disabled={!isSuperAdmin || credSaving}
                onChange={(e) => setCredEmail(e.target.value)}
              />
              {credEmailDuplicate ? (
                <p className="mt-1 text-xs text-red-600">
                  Already used by {credEmailDuplicate.name} ({credEmailDuplicate.email})
                </p>
              ) : (
                <p className="mt-1 text-xs text-stone-500">
                  Must be unique — cannot match another staff member.
                </p>
              )}
            </div>
            <div>
              <Label>New password</Label>
              <Input
                className="mt-1.5"
                type="password"
                autoComplete="new-password"
                value={credPassword}
                disabled={!isSuperAdmin || credSaving}
                onChange={(e) => setCredPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <Label>Confirm password</Label>
              <Input
                className="mt-1.5"
                type="password"
                autoComplete="new-password"
                value={credConfirm}
                disabled={!isSuperAdmin || credSaving}
                onChange={(e) => setCredConfirm(e.target.value)}
                placeholder="Repeat new password"
              />
              {credPassword && credConfirm && credPassword !== credConfirm && (
                <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
              )}
            </div>
            {!isSuperAdmin && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Only a Super Admin can set password/email directly. You can still send a reset
                link.
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                disabled={resetting || credSaving}
                onClick={() => void sendResetLink()}
              >
                {resetting ? "Sending…" : "Send reset link"}
              </Button>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={credSaving || resetting}
                  onClick={closeCredentials}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={
                    !isSuperAdmin ||
                    credSaving ||
                    Boolean(credEmailDuplicate) ||
                    (!credPassword &&
                      credEmail.trim().toLowerCase() ===
                        credentialsTarget.email.toLowerCase()) ||
                    Boolean(credPassword && credPassword !== credConfirm)
                  }
                  onClick={() => void saveCredentials()}
                >
                  <KeyRound className="h-4 w-4" />
                  {credSaving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

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
              placeholder="name@rajasthantouring.com"
            />
            {newEmailDuplicate ? (
              <p className="mt-1 text-xs text-red-600">
                Already used by {newEmailDuplicate.name}
              </p>
            ) : (
              <p className="mt-1 text-xs text-stone-500">Must be unique across staff.</p>
            )}
          </div>
          <div>
            <Label>Permission group</Label>
            <Select
              className="mt-1.5"
              value={newGroupId ?? ""}
              onChange={(e) => setNewGroupId(e.target.value || null)}
            >
              <option value="">None — use role preset</option>
              {permGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
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
              <option value="staff">{ROLE_LABELS.staff}</option>
            </Select>
          </div>
          <p className="text-xs text-stone-500">
            After adding, use <strong>Reset pwd</strong> to set their password or send a reset
            link.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={Boolean(newEmailDuplicate)}
              onClick={() => void addMember()}
            >
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={createGroupOpen} onClose={() => setCreateGroupOpen(false)} title="New permission group">
        <div className="space-y-4">
          <div>
            <Label>Group name *</Label>
            <Input
              className="mt-1.5"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="e.g. Sales Team"
            />
          </div>
          <p className="text-xs text-stone-500">
            Starts with the Staff role preset. Edit permissions after creating.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateGroupOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void createGroup()}>
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
