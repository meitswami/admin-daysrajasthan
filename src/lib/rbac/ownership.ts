import type { TeamMember } from "@/types/rbac";
import { hasPermission } from "@/lib/rbac/permissions";

export type OwnedRecord = {
  created_by_id?: string | null;
  created_by_name?: string | null;
};

/** True when the signed-in member is the record creator. */
export function isOwnCreatedRecord(actor: TeamMember, record: OwnedRecord): boolean {
  if (record.created_by_id && record.created_by_id === actor.id) return true;
  if (record.created_by_name && record.created_by_name === actor.name) return true;
  return false;
}

/**
 * "Created by {name}" for records made by someone else.
 * Hidden for the viewer's own records and when no creator name is stored.
 */
export function createdByAttribution(
  actor: TeamMember,
  record: OwnedRecord
): string | null {
  if (isOwnCreatedRecord(actor, record)) return null;
  const name = record.created_by_name?.trim();
  if (!name) return null;
  return `Created by ${name}`;
}

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
