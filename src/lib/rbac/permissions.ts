import type { PermissionKey, TeamRole } from "@/types/rbac";
import { getCurrentTeamMember } from "./current-user";
import { roleHasPermission } from "./permission-overrides";
import { memberHasPermission } from "./staff-store";

export function hasPermission(permission: PermissionKey, role?: TeamRole): boolean {
  const member = getCurrentTeamMember();
  if (!role || role === member.role) {
    return memberHasPermission(member, permission);
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
    "/inquiries": "website.view",
    "/whatsapp-leads": "website.view",
    "/contacts": "website.view",
    "/reports": "reports.view",
    "/settings": "settings.system",
    "/staff": "team.manage",
    "/itineraries": "website.view",
    "/website": "website.view",
    "/master-data": "master_data.view",
    "/operations": "operations.view",
    "/web-settings": "settings.system",
    "/ai-chat": "chat.manage",
    "/blogs": "website.view",
    "/search": "dashboard.view",
  };

  for (const [prefix, perm] of Object.entries(map)) {
    if (moduleHref === prefix || moduleHref.startsWith(prefix + "/")) {
      return hasPermission(perm);
    }
  }
  return false;
}
