/**
 * Chat platform persistence — Supabase `td_chat_platform` (no localStorage).
 * Session memory cache for sync service callers; durable writes go to DB.
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
import type { AiProviderSlot, ChatAiMode, ChatPlatformState, ChatWebsite } from "./types";
import { isSupabaseConfigured } from "@/lib/system/data-mode";

const ROW_ID = "default";

let memory: ChatPlatformState | null = null;
let hydratePromise: Promise<ChatPlatformState> | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function migrateAiMode(mode: string | undefined): ChatAiMode {
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

function normalizePartial(parsed: Partial<ChatPlatformState>): ChatPlatformState {
  const base = emptyState();
  const hasPayload = Boolean(parsed.websites?.length || parsed.keys?.length || parsed.settings);
  if (!hasPayload) return base;
  return {
    ...base,
    ...parsed,
    websites: migrateWebsites(
      parsed.websites?.length ? (parsed.websites as ChatWebsite[]) : base.websites
    ),
    sessions: parsed.sessions ?? [],
    messages: parsed.messages ?? [],
    analyticsLog: parsed.analyticsLog ?? [],
    conversations: parsed.conversations ?? [],
    feedback: parsed.feedback ?? [],
    settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
    providers: migrateProviders(parsed.providers as AiProviderSlot[] | undefined),
  };
}

async function fetchFromSupabase(): Promise<ChatPlatformState> {
  if (!isSupabaseConfigured()) return emptyState();
  try {
    const { createClient } = await import("@/lib/supabase/client");
    const sb = createClient();
    const { data, error } = await sb
      .from("td_chat_platform")
      .select("payload")
      .eq("id", ROW_ID)
      .maybeSingle();
    if (error) {
      console.warn("[chat] load failed", error.message);
      return emptyState();
    }
    const payload = (data?.payload ?? {}) as Partial<ChatPlatformState>;
    return normalizePartial(payload);
  } catch (e) {
    console.warn("[chat] load exception", e);
    return emptyState();
  }
}

async function persistToSupabase(state: ChatPlatformState): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const { createClient } = await import("@/lib/supabase/client");
    const sb = createClient();
    const { error } = await sb.from("td_chat_platform").upsert({
      id: ROW_ID,
      payload: state,
      updated_at: new Date().toISOString(),
    });
    if (error) console.warn("[chat] save failed", error.message);
  } catch (e) {
    console.warn("[chat] save exception", e);
  }
}

function schedulePersist(state: ChatPlatformState) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    void persistToSupabase(state);
  }, 250);
}

/** Hydrate session memory from Supabase (call on admin chat mount). */
export async function hydrateChatPlatformFromSupabase(): Promise<ChatPlatformState> {
  if (hydratePromise) return hydratePromise;
  hydratePromise = fetchFromSupabase().then((state) => {
    memory = state;
    return state;
  });
  return hydratePromise;
}

export function loadChatPlatformState(): ChatPlatformState {
  if (memory) return memory;
  // Kick off background hydrate; return empty shell until then.
  void hydrateChatPlatformFromSupabase();
  const initial = emptyState();
  memory = initial;
  return initial;
}

export function saveChatPlatformState(state: ChatPlatformState): void {
  memory = state;
  schedulePersist(state);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("td-chat-platform-change"));
  }
  // Keep server inbox in sync for widget APIs
  void fetch("/api/chat/platform/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  }).catch(() => {
    /* optional */
  });
}

export function mutateChatPlatformState(
  mutator: (state: ChatPlatformState) => ChatPlatformState
): ChatPlatformState {
  const next = mutator(loadChatPlatformState());
  saveChatPlatformState(next);
  return next;
}

/** Force flush pending chat writes (e.g. before unload). */
export async function flushChatPlatformToSupabase(): Promise<void> {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (memory) await persistToSupabase(memory);
}
