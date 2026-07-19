/**
 * Chat lead offer → 20s Accept → rotate → floating claim → admin escalate.
 */

import { DEMO_TEAM } from "@/lib/rbac/current-user";
import { createAssignment } from "@/modules/customer-relations";
import { LEAD_ACCEPT_SECONDS_DEFAULT } from "./constants";
import { isTeamMemberOnline, listOnlineTeamMembers } from "./presence";
import {
  ensureServerChatPlatformState,
  mutateServerChatPlatformState,
} from "./server-store";
import type { ChatConversationStub, ChatHandoffStatus } from "./types";

function acceptSeconds(): number {
  const s = ensureServerChatPlatformState().settings.leadAcceptSeconds;
  return Number.isFinite(s) && s > 0 ? s : LEAD_ACCEPT_SECONDS_DEFAULT;
}

function resolveMember(id: string | null | undefined) {
  if (!id) return null;
  return DEMO_TEAM.find((m) => m.id === id && m.is_active) ?? null;
}

function eligibleAgents(excludeIds: string[] = []) {
  const excluded = new Set(excludeIds);
  return DEMO_TEAM.filter(
    (m) =>
      m.is_active &&
      !excluded.has(m.id) &&
      (m.role === "sales" ||
        m.role === "sales_admin" ||
        m.role === "admin" ||
        m.role === "superadmin")
  );
}

function pickNextOfferTarget(input: {
  preferredId?: string | null;
  declinedIds: string[];
  requireOnline: boolean;
}) {
  const declined = new Set(input.declinedIds);
  const online = listOnlineTeamMembers();
  const onlineIds = new Set(online.map((o) => o.teamMemberId));

  const preferred = resolveMember(input.preferredId ?? null);
  if (
    preferred &&
    !declined.has(preferred.id) &&
    (!input.requireOnline || onlineIds.has(preferred.id))
  ) {
    return preferred;
  }

  // Prefer online sales, then any online eligible, then offline preferred pool
  const pool = eligibleAgents([...declined]);
  const onlinePool = pool.filter((m) => onlineIds.has(m.id));
  if (onlinePool.length) {
    const sales = onlinePool.find((m) => m.role === "sales" || m.role === "sales_admin");
    return sales ?? onlinePool[0];
  }
  if (input.requireOnline) return null;
  return pool.find((m) => m.role === "sales" || m.role === "sales_admin") ?? pool[0] ?? null;
}

function applyOffer(
  conv: ChatConversationStub,
  agent: { id: string; name: string },
  assignedBy: string
): ChatConversationStub {
  const expires = new Date(Date.now() + acceptSeconds() * 1000).toISOString();
  return {
    ...conv,
    status: "queued",
    handoffStatus: "offered",
    offeredToTeamMemberId: agent.id,
    offeredToName: agent.name,
    offerExpiresAt: expires,
    assignedToTeamMemberId: agent.id,
    assignedToName: agent.name,
    assignedAt: new Date().toISOString(),
    assignedBy,
    humanTakeover: false,
    floatingAt: null,
    escalatedToAdminAt: null,
    updatedAt: new Date().toISOString(),
  };
}

function markFloating(conv: ChatConversationStub): ChatConversationStub {
  return {
    ...conv,
    status: "queued",
    handoffStatus: "floating",
    offeredToTeamMemberId: null,
    offeredToName: null,
    offerExpiresAt: null,
    floatingAt: new Date().toISOString(),
    escalatedToAdminAt: new Date().toISOString(),
    adminNotifiedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/** Create first offer for a brand-new conversation lead. */
export function startLeadOffer(conv: ChatConversationStub): ChatConversationStub {
  const settings = ensureServerChatPlatformState().settings;
  const declined = conv.declinedByTeamMemberIds ?? [];

  if (settings.handoffMode === "admin_assign") {
    // Queue for Superadmin assignment — also escalate notification
    return {
      ...conv,
      status: "queued",
      handoffStatus: "queued_human",
      offeredToTeamMemberId: null,
      offeredToName: null,
      offerExpiresAt: null,
      escalatedToAdminAt: new Date().toISOString(),
      adminNotifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const online = listOnlineTeamMembers();
  const agent = pickNextOfferTarget({
    preferredId: settings.defaultAgentTeamMemberId,
    declinedIds: declined,
    requireOnline: online.length > 0,
  });

  if (!agent) {
    return markFloating(conv);
  }

  // If preferred agent is offline and others are online, still offer to an online agent
  const offered = applyOffer(conv, agent, "system:auto_human");
  return offered;
}

function patchConversation(
  conversationId: string,
  mutator: (c: ChatConversationStub) => ChatConversationStub
): ChatConversationStub | null {
  let updated: ChatConversationStub | null = null;
  mutateServerChatPlatformState((s) => ({
    ...s,
    conversations: s.conversations.map((c) => {
      if (c.id !== conversationId) return c;
      updated = mutator(c);
      return updated;
    }),
  }));
  return updated;
}

/** Expire offers, rotate to next online agent, or float + escalate admin. */
export function processLeadRotations(now = Date.now()): {
  rotated: ChatConversationStub[];
  escalated: ChatConversationStub[];
} {
  const rotated: ChatConversationStub[] = [];
  const escalated: ChatConversationStub[] = [];
  const state = ensureServerChatPlatformState();

  for (const conv of state.conversations) {
    if (conv.handoffStatus !== "offered" || !conv.offerExpiresAt) continue;
    if (new Date(conv.offerExpiresAt).getTime() > now) continue;

    const declined = [
      ...(conv.declinedByTeamMemberIds ?? []),
      ...(conv.offeredToTeamMemberId ? [conv.offeredToTeamMemberId] : []),
    ];

    const next = pickNextOfferTarget({
      preferredId: null,
      declinedIds: declined,
      requireOnline: true,
    });

    const updated = patchConversation(conv.id, (c) => {
      const base = { ...c, declinedByTeamMemberIds: declined };
      if (next) {
        const offered = applyOffer(base, next, "system:rotation");
        rotated.push(offered);
        return offered;
      }
      const floated = markFloating(base);
      escalated.push(floated);
      return floated;
    });

    if (!updated && !next) {
      // already handled
    }
  }

  return { rotated, escalated };
}

export function acceptLeadOffer(input: {
  conversationId: string;
  teamMemberId: string;
}): ChatConversationStub {
  const member = resolveMember(input.teamMemberId);
  if (!member) throw new Error("Team member not found");

  const updated = patchConversation(input.conversationId, (c) => {
    if (c.handoffStatus !== "offered") {
      throw new Error("Lead is not currently offered");
    }
    if (c.offeredToTeamMemberId !== input.teamMemberId) {
      throw new Error("This lead was offered to another agent");
    }
    if (c.offerExpiresAt && new Date(c.offerExpiresAt).getTime() < Date.now()) {
      throw new Error("Accept window expired — lead is rotating");
    }
    return {
      ...c,
      status: "open",
      handoffStatus: "human_active" as ChatHandoffStatus,
      humanTakeover: true,
      assignedToTeamMemberId: member.id,
      assignedToName: member.name,
      assignedAt: new Date().toISOString(),
      assignedBy: member.name,
      offeredToTeamMemberId: null,
      offeredToName: null,
      offerExpiresAt: null,
      floatingAt: null,
      escalatedToAdminAt: null,
      updatedAt: new Date().toISOString(),
    };
  });

  if (!updated) throw new Error("Conversation not found");

  void createAssignment({
    entityType: "inquiry",
    entityId: updated.id,
    assignedTo: member.name,
    assignedBy: member.name,
    priority: "high",
    note: `Chat lead accepted within countdown by ${member.name}`,
  }).catch(() => undefined);

  return updated;
}

/** Any online agent claims a floating / escalated lead. */
export function claimFloatingLead(input: {
  conversationId: string;
  teamMemberId: string;
}): ChatConversationStub {
  const member = resolveMember(input.teamMemberId);
  if (!member) throw new Error("Team member not found");
  if (!isTeamMemberOnline(input.teamMemberId)) {
    throw new Error("You must be Online/Active to claim this lead");
  }

  const updated = patchConversation(input.conversationId, (c) => {
    if (c.handoffStatus !== "floating" && c.handoffStatus !== "escalated_admin") {
      throw new Error("Lead is not claimable");
    }
    return {
      ...c,
      status: "open",
      handoffStatus: "human_active",
      humanTakeover: true,
      assignedToTeamMemberId: member.id,
      assignedToName: member.name,
      assignedAt: new Date().toISOString(),
      assignedBy: `claim:${member.name}`,
      offeredToTeamMemberId: null,
      offeredToName: null,
      offerExpiresAt: null,
      floatingAt: null,
      escalatedToAdminAt: null,
      updatedAt: new Date().toISOString(),
    };
  });

  if (!updated) throw new Error("Conversation not found");

  void createAssignment({
    entityType: "inquiry",
    entityId: updated.id,
    assignedTo: member.name,
    assignedBy: member.name,
    priority: "urgent",
    note: `Floating chat lead claimed by ${member.name}`,
  }).catch(() => undefined);

  return updated;
}

export function listActionableLeadsForMember(teamMemberId: string): {
  offered: ChatConversationStub[];
  floating: ChatConversationStub[];
  adminEscalations: ChatConversationStub[];
} {
  processLeadRotations();
  const state = ensureServerChatPlatformState();
  const member = resolveMember(teamMemberId);
  const isAdmin = member?.role === "superadmin" || member?.role === "admin";

  return {
    offered: state.conversations.filter(
      (c) => c.handoffStatus === "offered" && c.offeredToTeamMemberId === teamMemberId
    ),
    floating: state.conversations.filter(
      (c) => c.handoffStatus === "floating" || c.handoffStatus === "escalated_admin"
    ),
    adminEscalations: isAdmin
      ? state.conversations.filter(
          (c) =>
            c.handoffStatus === "escalated_admin" ||
            c.handoffStatus === "floating" ||
            c.handoffStatus === "queued_human" ||
            (c.handoffStatus === "offered" &&
              c.offerExpiresAt &&
              new Date(c.offerExpiresAt).getTime() < Date.now())
        )
      : [],
  };
}

export function secondsLeft(offerExpiresAt: string | null | undefined, now = Date.now()): number {
  if (!offerExpiresAt) return 0;
  return Math.max(0, Math.ceil((new Date(offerExpiresAt).getTime() - now) / 1000));
}
