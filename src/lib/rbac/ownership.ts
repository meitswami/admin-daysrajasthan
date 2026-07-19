import type { TeamMember } from "@/types/rbac";
import { hasPermission } from "@/lib/rbac/permissions";

export type OwnedRecord = {
  created_by_id?: string | null;
  created_by_name?: string | null;
};

function isOwner(actor: TeamMember, record: OwnedRecord): boolean {
  if (!record.created_by_id) return false;
  return record.created_by_id === actor.id;
}

export function canEditMasterRecord(actor: TeamMember, record: OwnedRecord): boolean {
  if (hasPermission("master_data.edit_any", actor.role)) return true;
  if (hasPermission("master_data.edit_own", actor.role) && isOwner(actor, record)) return true;
  return false;
}

export function canDeleteMasterRecord(actor: TeamMember, record: OwnedRecord): boolean {
  if (hasPermission("master_data.delete_any", actor.role)) return true;
  if (hasPermission("master_data.delete_own", actor.role) && isOwner(actor, record)) return true;
  return false;
}

/** True when the actor may view but must not change fields */
export function isMasterDataLocked(actor: TeamMember, record: OwnedRecord): boolean {
  return !canEditMasterRecord(actor, record);
}

export function canCreateMasterData(actor?: TeamMember): boolean {
  return hasPermission("master_data.create", actor?.role);
}
