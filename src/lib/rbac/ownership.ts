import type { TeamMember } from "@/types/rbac";
import { hasPermission } from "@/lib/rbac/permissions";

export type OwnedRecord = {
  created_by_id?: string | null;
  created_by_name?: string | null;
};

/** Edit is available to every staff member who can open master data (creator ignored). */
export function canEditMasterRecord(_actor: TeamMember, _record: OwnedRecord): boolean {
  return true;
}

/** Delete is available to every staff member who can open master data (creator ignored). */
export function canDeleteMasterRecord(_actor: TeamMember, _record: OwnedRecord): boolean {
  return true;
}

/** Always unlocked — ownership no longer restricts master-data fields. */
export function isMasterDataLocked(_actor: TeamMember, _record: OwnedRecord): boolean {
  return false;
}

export function canCreateMasterData(actor?: TeamMember): boolean {
  return hasPermission("master_data.create", actor?.role);
}
