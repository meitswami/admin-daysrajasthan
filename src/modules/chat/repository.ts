/**
 * Chat platform persistence — localStorage demo store (multi-website ready).
 * Never queries tourism Supabase tables.
 */

import {
  CHAT_STORAGE_KEY,
  DEFAULT_APPEARANCE,
  DEFAULT_BEHAVIOUR,
  DEFAULT_KNOWLEDGE_SCOPE,
  DEFAULT_PROMPTS,
  DEFAULT_PROVIDERS,
  DEFAULT_SETTINGS,
  createDefaultWebsite,
} from "./constants";
import type { AiProviderSlot, ChatAiMode, ChatPlatformState, ChatWebsite } from "./types";

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

function normalizeStoredHfModel(modelId: string | null | undefined): string | null {
  if (modelId == null) return null;
  const raw = modelId.trim();
  if (!raw) return null;
  if (raw.includes(":")) return raw;
  if (raw.toLowerCase() === "qwen/qwen2.5-3b-instruct") {
    return "Qwen/Qwen2.5-3B-Instruct:featherless-ai";
  }
  return raw;
}

function migrateProviders(providers: AiProviderSlot[] | undefined): AiProviderSlot[] {
  const base = DEFAULT_PROVIDERS.map((d) => ({ ...d }));
  if (!providers?.length) return base;
  const byId = new Map(providers.map((p) => [p.providerId, p]));
  const merged = base.map((def) => {
    const prev = byId.get(def.providerId);
    if (!prev) return def;
    const modelId =
      def.providerId === "huggingface"
        ? normalizeStoredHfModel(prev.modelId ?? def.modelId)
        : (prev.modelId ?? def.modelId);
    return {
      ...def,
      ...prev,
      modelId,
      // Keep cloud + local providers online by default after platform upgrade
      enabled:
        def.providerId === "none"
          ? false
          : def.providerId === "local" ||
              def.providerId === "github-models" ||
              def.providerId === "groq" ||
              def.providerId === "huggingface" ||
              def.providerId === "openrouter"
            ? true
            : (prev.enabled ?? def.enabled),
      apiKeyMasked: prev.apiKeyMasked ?? null,
      hasApiKey: prev.hasApiKey ?? false,
      status: prev.status ?? def.status,
      lastSuccessAt: prev.lastSuccessAt ?? null,
      lastError: prev.lastError ?? null,
      lastTestedAt: prev.lastTestedAt ?? null,
    };
  });
  for (const p of providers) {
    if (!merged.some((m) => m.providerId === p.providerId)) {
      merged.push({
        ...p,
        modelId:
          p.providerId === "huggingface" ? normalizeStoredHfModel(p.modelId) : (p.modelId ?? null),
        apiKeyMasked: p.apiKeyMasked ?? null,
        hasApiKey: p.hasApiKey ?? false,
        status: p.status ?? "idle",
        lastSuccessAt: p.lastSuccessAt ?? null,
        lastError: p.lastError ?? null,
        lastTestedAt: p.lastTestedAt ?? null,
      });
    }
  }
  return merged;
}

function migrateWebsites(websites: ChatWebsite[]): ChatWebsite[] {
  return websites.map((w) => ({
    ...w,
    aiMode: migrateAiMode(w.aiMode as string),
    appearance: migrateAppearance(w.appearance),
    behaviour: { ...DEFAULT_BEHAVIOUR, ...w.behaviour },
    knowledgeScope: { ...DEFAULT_KNOWLEDGE_SCOPE, ...w.knowledgeScope },
  }));
}

function emptyState(): ChatPlatformState {
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

export function loadChatPlatformState(): ChatPlatformState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) {
      const initial = emptyState();
      saveChatPlatformState(initial);
      return initial;
    }
    const parsed = JSON.parse(raw) as Partial<ChatPlatformState>;
    const base = emptyState();
    return {
      ...base,
      ...parsed,
      websites: migrateWebsites(
        parsed.websites?.length ? (parsed.websites as ChatWebsite[]) : base.websites
      ),
      sessions: parsed.sessions ?? [],
      messages: parsed.messages ?? [],
      analyticsLog: parsed.analyticsLog ?? [],
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      providers: migrateProviders(parsed.providers as AiProviderSlot[] | undefined),
    };
  } catch {
    return emptyState();
  }
}

export function saveChatPlatformState(state: ChatPlatformState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("td-chat-platform-change"));
  void fetch("/api/chat/platform/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  }).catch(() => {
    /* demo sync optional */
  });
}

export function mutateChatPlatformState(
  mutator: (state: ChatPlatformState) => ChatPlatformState
): ChatPlatformState {
  const next = mutator(loadChatPlatformState());
  saveChatPlatformState(next);
  return next;
}
