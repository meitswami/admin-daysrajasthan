/**
 * Chat platform persistence — localStorage demo store (multi-website ready).
 * Never queries tourism Supabase tables.
 */

import {
  CHAT_STORAGE_KEY,
  DEFAULT_PROMPTS,
  DEFAULT_PROVIDERS,
  DEFAULT_SETTINGS,
  createDefaultWebsite,
} from "./constants";
import type { ChatAiMode, ChatPlatformState, ChatWebsite } from "./types";

function migrateAiMode(mode: string | undefined): ChatAiMode {
  if (mode === "ai" || mode === "offline" || mode === "disabled") return mode;
  if (mode === "ai_ready_future") return "ai";
  if (mode === "manual") return "offline";
  return "ai";
}

function migrateWebsites(websites: ChatWebsite[]): ChatWebsite[] {
  return websites.map((w) => ({
    ...w,
    aiMode: migrateAiMode(w.aiMode as string),
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
