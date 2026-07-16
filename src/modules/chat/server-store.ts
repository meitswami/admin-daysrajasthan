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
  };
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
