/**
 * Process-memory store for public widget resolution + chat sessions (demo).
 */

import {
  DEFAULT_APPEARANCE,
  DEFAULT_BEHAVIOUR,
  DEFAULT_KNOWLEDGE_SCOPE,
  DEFAULT_PROMPTS,
  DEFAULT_PROVIDERS,
  DEFAULT_SETTINGS,
  createDefaultWebsite,
} from "./constants";
import type { ChatAiMode, ChatPlatformState, ChatWebsite } from "./types";

const g = globalThis as typeof globalThis & {
  __tdChatPlatformServer?: ChatPlatformState | null;
};

function migrateAiMode(mode: string | undefined): ChatAiMode {
  if (mode === "ai" || mode === "offline" || mode === "disabled") return mode;
  if (mode === "ai_ready_future") return "ai";
  if (mode === "manual") return "offline";
  return "ai";
}

function bootstrapState(): ChatPlatformState {
  const site = createDefaultWebsite({
    id: "site_primary",
    name: "Travel Days Website",
    slug: "primary",
    aiMode: "ai",
  });
  return {
    websites: [site],
    keys: [],
    domains: [
      {
        id: "dom_local",
        websiteId: site.id,
        origin: "http://localhost:3000",
        enabled: true,
      },
    ],
    providers: DEFAULT_PROVIDERS,
    prompts: DEFAULT_PROMPTS,
    conversations: [],
    feedback: [],
    sessions: [],
    messages: [],
    analyticsLog: [],
    settings: { ...DEFAULT_SETTINGS, defaultWebsiteId: site.id },
    embedsGeneratedCount: 0,
  };
}

function normalizeState(state: ChatPlatformState): ChatPlatformState {
  return {
    ...bootstrapState(),
    ...state,
    websites: (state.websites ?? []).map((w: ChatWebsite) => ({
      ...w,
      aiMode: migrateAiMode(w.aiMode as string),
      appearance: { ...DEFAULT_APPEARANCE, ...w.appearance },
      behaviour: { ...DEFAULT_BEHAVIOUR, ...w.behaviour },
      knowledgeScope: { ...DEFAULT_KNOWLEDGE_SCOPE, ...w.knowledgeScope },
    })),
    sessions: state.sessions ?? [],
    messages: state.messages ?? [],
    analyticsLog: state.analyticsLog ?? [],
    conversations: (state.conversations ?? []).map((c) => ({
      ...c,
      queries: c.queries ?? [],
      handoffStatus: c.handoffStatus ?? "ai",
      assignedToTeamMemberId: c.assignedToTeamMemberId ?? null,
      assignedToName: c.assignedToName ?? null,
      assignedAt: c.assignedAt ?? null,
      assignedBy: c.assignedBy ?? null,
      humanTakeover: c.humanTakeover ?? false,
      email: c.email ?? null,
    })),
    settings: { ...DEFAULT_SETTINGS, ...state.settings },
    providers: state.providers?.length ? state.providers : DEFAULT_PROVIDERS,
  };
}

/**
 * Merge admin config sync without wiping live Superadmin query inbox / sessions.
 */
export function mergeAdminConfigIntoServer(incoming: ChatPlatformState): ChatPlatformState {
  const existing = g.__tdChatPlatformServer;
  const next = normalizeState({
    ...incoming,
    // Preserve runtime inbox unless incoming already carries richer runtime data
    conversations:
      (existing?.conversations?.length ?? 0) >= (incoming.conversations?.length ?? 0)
        ? existing?.conversations ?? incoming.conversations ?? []
        : incoming.conversations ?? [],
    messages:
      (existing?.messages?.length ?? 0) >= (incoming.messages?.length ?? 0)
        ? existing?.messages ?? incoming.messages ?? []
        : incoming.messages ?? [],
    sessions:
      (existing?.sessions?.length ?? 0) >= (incoming.sessions?.length ?? 0)
        ? existing?.sessions ?? incoming.sessions ?? []
        : incoming.sessions ?? [],
    analyticsLog:
      (existing?.analyticsLog?.length ?? 0) >= (incoming.analyticsLog?.length ?? 0)
        ? existing?.analyticsLog ?? incoming.analyticsLog ?? []
        : incoming.analyticsLog ?? [],
  });
  g.__tdChatPlatformServer = next;
  return next;
}

export function getServerChatPlatformState(): ChatPlatformState | null {
  return g.__tdChatPlatformServer ?? null;
}

export function setServerChatPlatformState(state: ChatPlatformState): void {
  g.__tdChatPlatformServer = normalizeState(state);
}

/** Ensure server has at least the default website for local demo keys. */
export function ensureServerChatPlatformState(): ChatPlatformState {
  const existing = g.__tdChatPlatformServer;
  if (existing?.websites?.length) {
    const normalized = normalizeState(existing);
    g.__tdChatPlatformServer = normalized;
    return normalized;
  }
  const boot = bootstrapState();
  g.__tdChatPlatformServer = boot;
  return boot;
}

export function mutateServerChatPlatformState(
  mutator: (state: ChatPlatformState) => ChatPlatformState
): ChatPlatformState {
  const current = ensureServerChatPlatformState();
  const next = normalizeState(mutator(current));
  g.__tdChatPlatformServer = next;
  return next;
}
