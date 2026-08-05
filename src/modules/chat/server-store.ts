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
  // Product default: always online AI. Keep explicit "disabled" only.
  if (mode === "disabled") return "disabled";
  if (mode === "ai" || mode === "ai_ready_future") return "ai";
  if (mode === "offline" || mode === "manual") return "ai";
  return "ai";
}

function migrateAppearance(
  appearance: ChatWebsite["appearance"] | undefined
): ChatWebsite["appearance"] {
  const merged = { ...DEFAULT_APPEARANCE, ...appearance };
  if (/offline mode is on/i.test(merged.welcomeBody ?? "")) {
    merged.welcomeBody = DEFAULT_APPEARANCE.welcomeBody;
  }
  return merged;
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
      appearance: migrateAppearance(w.appearance),
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
    providers: state.providers?.length
      ? state.providers.map((p) => {
          const def = DEFAULT_PROVIDERS.find((d) => d.providerId === p.providerId);
          const enabled =
            p.providerId === "none"
              ? false
              : p.providerId === "local" ||
                  p.providerId === "github-models" ||
                  p.providerId === "groq" ||
                  p.providerId === "huggingface" ||
                  p.providerId === "openrouter"
                ? true
                : (p.enabled ?? def?.enabled ?? false);
          return {
            ...def,
            ...p,
            enabled,
            modelId: p.modelId ?? null,
            apiKeyMasked: p.apiKeyMasked ?? null,
            hasApiKey: p.hasApiKey ?? false,
            status: p.status ?? "idle",
            lastSuccessAt: p.lastSuccessAt ?? null,
            lastError: p.lastError ?? null,
            lastTestedAt: p.lastTestedAt ?? null,
          };
        })
      : DEFAULT_PROVIDERS,
  };
}

/**
 * Merge admin config sync without wiping live Superadmin query inbox / sessions.
 */
export function mergeAdminConfigIntoServer(incoming: ChatPlatformState): ChatPlatformState {
  const existing = g.__tdChatPlatformServer;
  const next = normalizeState({
    ...incoming,
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
  void persistServerState(next);
  return next;
}

export function getServerChatPlatformState(): ChatPlatformState | null {
  return g.__tdChatPlatformServer ?? null;
}

export function setServerChatPlatformState(state: ChatPlatformState): void {
  g.__tdChatPlatformServer = normalizeState(state);
  void persistServerState(g.__tdChatPlatformServer);
}

/** Ensure server has at least the default website; hydrate from Supabase when empty. */
export function ensureServerChatPlatformState(): ChatPlatformState {
  const existing = g.__tdChatPlatformServer;
  if (existing?.websites?.length) {
    const normalized = normalizeState(existing);
    g.__tdChatPlatformServer = normalized;
    return normalized;
  }
  const boot = bootstrapState();
  g.__tdChatPlatformServer = boot;
  // Background hydrate overwrites bootstrap when cloud data exists
  void hydrateServerChatFromSupabase();
  return boot;
}

export function mutateServerChatPlatformState(
  mutator: (state: ChatPlatformState) => ChatPlatformState
): ChatPlatformState {
  const current = ensureServerChatPlatformState();
  const next = normalizeState(mutator(current));
  g.__tdChatPlatformServer = next;
  void persistServerState(next);
  return next;
}

async function persistServerState(state: ChatPlatformState): Promise<void> {
  try {
    const { isSupabaseConfigured } = await import("@/lib/system/data-mode");
    if (!isSupabaseConfigured()) return;
    const { createClient } = await import("@/lib/supabase/server");
    const sb = await createClient();
    await sb.from("td_chat_platform").upsert({
      id: "default",
      payload: state,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("[chat-server] persist failed", e);
  }
}

export async function hydrateServerChatFromSupabase(): Promise<ChatPlatformState> {
  try {
    const { isSupabaseConfigured } = await import("@/lib/system/data-mode");
    if (!isSupabaseConfigured()) {
      const boot = bootstrapState();
      g.__tdChatPlatformServer = g.__tdChatPlatformServer ?? boot;
      return g.__tdChatPlatformServer;
    }
    const { createClient } = await import("@/lib/supabase/server");
    const sb = await createClient();
    const { data } = await sb
      .from("td_chat_platform")
      .select("payload")
      .eq("id", "default")
      .maybeSingle();
    const payload = (data?.payload ?? null) as ChatPlatformState | null;
    if (payload && Array.isArray(payload.websites) && payload.websites.length > 0) {
      const normalized = normalizeState(payload);
      g.__tdChatPlatformServer = normalized;
      return normalized;
    }
  } catch (e) {
    console.warn("[chat-server] hydrate failed", e);
  }
  const boot = bootstrapState();
  if (!g.__tdChatPlatformServer) g.__tdChatPlatformServer = boot;
  return g.__tdChatPlatformServer;
}
