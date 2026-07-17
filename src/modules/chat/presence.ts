/**
 * Team presence for chat lead routing — who is Online/Active in admin.
 */

import { TEAM_ONLINE_TTL_MS } from "./constants";

export type TeamPresenceRecord = {
  teamMemberId: string;
  name: string;
  role: string;
  lastSeenAt: string;
};

const g = globalThis as typeof globalThis & {
  __tdChatTeamPresence?: Map<string, TeamPresenceRecord>;
};

function store(): Map<string, TeamPresenceRecord> {
  if (!g.__tdChatTeamPresence) g.__tdChatTeamPresence = new Map();
  return g.__tdChatTeamPresence;
}

export function heartbeatPresence(input: {
  teamMemberId: string;
  name: string;
  role: string;
}): TeamPresenceRecord {
  const row: TeamPresenceRecord = {
    teamMemberId: input.teamMemberId,
    name: input.name,
    role: input.role,
    lastSeenAt: new Date().toISOString(),
  };
  store().set(input.teamMemberId, row);
  return row;
}

export function listOnlineTeamMembers(now = Date.now()): TeamPresenceRecord[] {
  const cutoff = now - TEAM_ONLINE_TTL_MS;
  return [...store().values()]
    .filter((p) => new Date(p.lastSeenAt).getTime() >= cutoff)
    .sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());
}

export function isTeamMemberOnline(teamMemberId: string, now = Date.now()): boolean {
  const row = store().get(teamMemberId);
  if (!row) return false;
  return new Date(row.lastSeenAt).getTime() >= now - TEAM_ONLINE_TTL_MS;
}

export function listAllPresence(): TeamPresenceRecord[] {
  return [...store().values()];
}
