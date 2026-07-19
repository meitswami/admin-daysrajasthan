import type { PermissionKey, TeamRole } from "@/types/rbac";
import { getCurrentTeamMember } from "./current-user";
import { roleHasPermission } from "./permission-overrides";
import { memberHasPermission } from "./staff-store";

export function hasPermission(permission: PermissionKey, role?: TeamRole): boolean {
  const member = getCurrentTeamMember();
  // When checking the current session member, honour per-user overrides
  if (!role || role === member.role) {
    if (member.permission_overrides != null) {
      return memberHasPermission(member, permission);
    }
  }
  const r = role ?? member.role;
  return roleHasPermission(r, permission);
}

export function canAccessModule(moduleHref: string): boolean {
  const map: Record<string, PermissionKey> = {
    "/dashboard": "dashboard.view",
    "/itinerary-builder": "itinerary_builder.view",
    "/leads": "crm.leads",
    "/customers": "crm.view",
    "/inquiries": "crm.view",
    "/whatsapp-leads": "crm.view",
    "/contacts": "crm.view",
    "/reports": "reports.view",
    "/settings": "settings.view",
    "/staff": "team.manage",
    "/itineraries": "dashboard.view",
    "/website": "itinerary_builder.view",
    "/master-data": "master_data.view",
    "/operations": "operations.view",
    "/web-settings": "settings.view",
    "/ai-chat": "chat.manage",
    "/blogs": "dashboard.view",
    "/search": "dashboard.view",
  };

  for (const [prefix, perm] of Object.entries(map)) {
    if (moduleHref === prefix || moduleHref.startsWith(prefix + "/")) {
      return hasPermission(perm);
    }
  }
  return false;
}
