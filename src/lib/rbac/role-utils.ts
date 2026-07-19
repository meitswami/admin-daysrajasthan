import type { TeamRole } from "@/types/rbac";

export const TEAM_ROLES: TeamRole[] = [
  "superadmin",
  "admin",
  "sales_admin",
  "sales",
  "finance",
  "operations",
  "accounts",
  "staff",
];

/** Normalize DB / legacy role strings to TeamRole */
export function asTeamRole(value: string | null | undefined): TeamRole | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === "super_admin" || v === "superadmin") return "superadmin";
  if (v === "sales-admin" || v === "salesadmin") return "sales_admin";
  if (v === "accounts") return "finance";
  return TEAM_ROLES.includes(v as TeamRole) ? (v as TeamRole) : null;
}
