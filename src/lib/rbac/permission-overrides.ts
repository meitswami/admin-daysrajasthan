import {
  ALL_PERMISSION_KEYS,
  PRIMARY_ROLES,
  ROLE_PERMISSIONS,
  type PermissionKey,
  type RbacPermissionOverrides,
  type TeamRole,
} from "@/types/rbac";

const STORAGE_KEY = "td-rbac-permission-overrides-v1";
const SETTINGS_KEY = "rbac_permission_overrides";

let memoryOverrides: RbacPermissionOverrides | null = null;

function sanitizeOverrides(raw: unknown): RbacPermissionOverrides {
  if (!raw || typeof raw !== "object") return {};
  const out: RbacPermissionOverrides = {};
  for (const [role, perms] of Object.entries(raw as Record<string, unknown>)) {
    if (!PRIMARY_ROLES.includes(role as TeamRole) && role !== "operations" && role !== "accounts" && role !== "staff") {
      continue;
    }
    if (!Array.isArray(perms)) continue;
    const valid = perms.filter((p): p is PermissionKey =>
      typeof p === "string" && ALL_PERMISSION_KEYS.includes(p as PermissionKey)
    );
    out[role as TeamRole] = valid;
  }
  return out;
}

export function getPermissionOverrides(): RbacPermissionOverrides {
  if (memoryOverrides) return memoryOverrides;
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    memoryOverrides = sanitizeOverrides(JSON.parse(raw));
    return memoryOverrides;
  } catch {
    return {};
  }
}

export function setPermissionOverridesLocal(overrides: RbacPermissionOverrides): void {
  memoryOverrides = sanitizeOverrides(overrides);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryOverrides));
    window.dispatchEvent(new CustomEvent("td-rbac-overrides-change"));
  }
}

export function getEffectivePermissions(role: TeamRole): PermissionKey[] {
  const overrides = getPermissionOverrides();
  if (overrides[role]) return [...overrides[role]!];
  return [...(ROLE_PERMISSIONS[role] ?? [])];
}

export function roleHasPermission(role: TeamRole, permission: PermissionKey): boolean {
  return getEffectivePermissions(role).includes(permission);
}

export function toggleRolePermission(
  role: TeamRole,
  permission: PermissionKey,
  enabled: boolean
): RbacPermissionOverrides {
  const current = getEffectivePermissions(role);
  const next = enabled
    ? current.includes(permission)
      ? current
      : [...current, permission]
    : current.filter((p) => p !== permission);

  const overrides = { ...getPermissionOverrides(), [role]: next };
  setPermissionOverridesLocal(overrides);
  return overrides;
}

export function resetRolePermissions(role: TeamRole): RbacPermissionOverrides {
  const overrides = { ...getPermissionOverrides() };
  delete overrides[role];
  setPermissionOverridesLocal(overrides);
  return overrides;
}

export async function fetchPermissionOverridesFromServer(): Promise<RbacPermissionOverrides | null> {
  try {
    const res = await fetch("/api/system/rbac-permissions");
    if (!res.ok) return null;
    const data = (await res.json()) as { overrides?: unknown };
    if (!data.overrides) return null;
    const sanitized = sanitizeOverrides(data.overrides);
    setPermissionOverridesLocal(sanitized);
    return sanitized;
  } catch {
    return null;
  }
}

export async function persistPermissionOverridesToServer(
  overrides: RbacPermissionOverrides
): Promise<boolean> {
  try {
    const res = await fetch("/api/system/rbac-permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overrides }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export { SETTINGS_KEY as RBAC_OVERRIDES_SETTINGS_KEY };
