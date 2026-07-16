import { ROLE_PERMISSIONS, type PermissionKey, type TeamRole } from "@/types/rbac";
import { getCurrentTeamMember } from "./current-user";

export function hasPermission(permission: PermissionKey, role?: TeamRole): boolean {
  const r = role ?? getCurrentTeamMember().role;
  return ROLE_PERMISSIONS[r]?.includes(permission) ?? false;
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
    "/itineraries": "dashboard.view",
    "/website": "itinerary_builder.view",
    "/master-data": "itinerary_builder.view",
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
