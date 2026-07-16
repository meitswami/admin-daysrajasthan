/**
 * Permission checks — interface ready for RBAC expansion.
 */

import type { GatewayActor } from "./types";

export type PermissionChecker = (
  actor: GatewayActor,
  permission: string
) => Promise<boolean> | boolean;

/** Default: authenticated/service actors pass; anonymous fails non-public permissions. */
export const defaultPermissionChecker: PermissionChecker = (actor, permission) => {
  if (!permission) return true;
  if (actor.roles.includes("service")) return true;
  if (actor.roles.includes("authenticated")) return true;
  if (actor.roles.includes("anonymous") && permission.startsWith("public.")) return true;
  return false;
};

let activeChecker: PermissionChecker = defaultPermissionChecker;

/** Inject permission checker. */
export function setPermissionChecker(checker: PermissionChecker): void {
  activeChecker = checker;
}

/** Check permission for actor. */
export async function checkPermission(
  actor: GatewayActor,
  permission: string | null | undefined
): Promise<boolean> {
  if (!permission) return true;
  return activeChecker(actor, permission);
}
