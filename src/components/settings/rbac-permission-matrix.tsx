"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  ALL_PERMISSION_KEYS,
  PERMISSION_LABELS,
  PRIMARY_ROLES,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  type PermissionKey,
  type TeamRole,
} from "@/types/rbac";
import {
  fetchPermissionOverridesFromServer,
  getEffectivePermissions,
  persistPermissionOverridesToServer,
  resetRolePermissions,
  setPermissionOverridesLocal,
  toggleRolePermission,
} from "@/lib/rbac/permission-overrides";
import { cn } from "@/lib/utils";

export function RbacPermissionMatrix({ canEdit }: { canEdit: boolean }) {
  const { show } = useToast();
  const [tick, setTick] = useState(0);
  const [saving, setSaving] = useState(false);
  const [activeRole, setActiveRole] = useState<TeamRole>("sales_admin");

  useEffect(() => {
    void fetchPermissionOverridesFromServer().then(() => setTick((t) => t + 1));
    const onChange = () => setTick((t) => t + 1);
    window.addEventListener("td-rbac-overrides-change", onChange);
    return () => window.removeEventListener("td-rbac-overrides-change", onChange);
  }, []);

  const effective = getEffectivePermissions(activeRole);

  function onToggle(permission: PermissionKey, enabled: boolean) {
    if (!canEdit) return;
    toggleRolePermission(activeRole, permission, enabled);
    setTick((t) => t + 1);
  }

  async function save() {
    setSaving(true);
    const overrides: Partial<Record<TeamRole, PermissionKey[]>> = {};
    for (const role of PRIMARY_ROLES) {
      const current = getEffectivePermissions(role);
      const defaults = ROLE_PERMISSIONS[role] ?? [];
      const same =
        current.length === defaults.length && current.every((p) => defaults.includes(p));
      if (!same) overrides[role] = current;
    }
    setPermissionOverridesLocal(overrides);
    const ok = await persistPermissionOverridesToServer(overrides);
    setSaving(false);
    show(ok ? "Permission matrix saved" : "Saved locally (server sync unavailable)");
    setTick((t) => t + 1);
  }

  function resetActive() {
    if (!canEdit) return;
    resetRolePermissions(activeRole);
    setTick((t) => t + 1);
    show(`Reset ${ROLE_LABELS[activeRole]} to defaults`);
  }

  return (
    <div className="space-y-4" key={tick}>
      <div className="flex flex-wrap gap-2">
        {PRIMARY_ROLES.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => setActiveRole(role)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              activeRole === role
                ? "bg-amber-100 text-amber-900"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            )}
          >
            {ROLE_LABELS[role]}
          </button>
        ))}
      </div>

      <p className="text-xs text-stone-500">
        {canEdit
          ? "Toggle permissions for the selected role, then Save. Sales Admin can create master data but only edit/delete their own records; Admin/Super Admin can edit anyone."
          : "Read-only — only Super Admin can change the matrix."}
      </p>

      <div className="max-h-80 overflow-y-auto rounded-xl border border-stone-100">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-stone-50 text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="px-3 py-2">Permission</th>
              <th className="px-3 py-2 w-24 text-center">Allowed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {ALL_PERMISSION_KEYS.map((perm) => {
              const on = effective.includes(perm);
              return (
                <tr key={perm}>
                  <td className="px-3 py-2">
                    <p className="font-medium text-stone-800">{PERMISSION_LABELS[perm]}</p>
                    <p className="font-mono text-[11px] text-stone-400">{perm}</p>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-stone-300"
                      checked={on}
                      disabled={!canEdit}
                      onChange={(e) => onToggle(perm, e.target.checked)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save matrix"}
          </Button>
          <Button type="button" variant="outline" onClick={resetActive}>
            Reset {ROLE_LABELS[activeRole]}
          </Button>
        </div>
      )}
    </div>
  );
}
