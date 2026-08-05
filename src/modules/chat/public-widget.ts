/**
 * Public widget key resolution — server / API routes only.
 * Do not import from Client Components (uses server-store → next/headers).
 */

import { LOCAL_DEMO_WIDGET_KEY_ALIASES } from "./constants";
import { hashWidgetSecret } from "./keys";
import { loadChatPlatformState, mutateChatPlatformState } from "./repository";
import {
  ensureServerChatPlatformState,
  getServerChatPlatformState,
  setServerChatPlatformState,
} from "./server-store";
import type { ChatPlatformState, ChatWebsite, PublicWidgetConfig } from "./types";

/** Prefer server store (API / embed); fall back to browser store in admin. */
function resolveStateForPublicLookup(): ChatPlatformState | null {
  if (typeof window === "undefined") {
    return ensureServerChatPlatformState();
  }
  return getServerChatPlatformState() ?? loadChatPlatformState();
}

function isLocalDemoWidgetKey(secretKey: string): boolean {
  const k = secretKey.trim().toLowerCase();
  return LOCAL_DEMO_WIDGET_KEY_ALIASES.some((alias) => alias.toLowerCase() === k);
}

function toPublicWidgetConfig(site: ChatWebsite): PublicWidgetConfig {
  return {
    websiteId: site.id,
    websiteName: site.name,
    aiMode: site.aiMode,
    appearance: site.appearance,
    behaviour: site.behaviour,
    knowledgeScope: site.knowledgeScope,
    enabled: site.enabled,
    intelligenceEnabled: site.enabled && site.aiMode === "ai",
  };
}

export async function resolvePublicWidgetConfig(
  secretKey: string
): Promise<PublicWidgetConfig | null> {
  const trimmed = secretKey.trim();
  if (!trimmed) return null;

  // Local demo keys always resolve against primary website (admin preview / paste tests)
  if (isLocalDemoWidgetKey(trimmed)) {
    const state = resolveStateForPublicLookup();
    if (!state) return null;
    const site =
      state.websites.find((w) => w.id === state.settings.defaultWebsiteId) ??
      state.websites[0];
    if (!site) return null;
    return toPublicWidgetConfig(site);
  }

  const hash = await hashWidgetSecret(trimmed);
  const state = resolveStateForPublicLookup();
  if (!state) return null;
  const key = state.keys.find((k) => k.secretHash === hash && !k.revokedAt);
  if (!key) return null;
  const site = state.websites.find((w) => w.id === key.websiteId);
  if (!site) return null;

  const next: ChatPlatformState = {
    ...state,
    keys: state.keys.map((k) =>
      k.id === key.id ? { ...k, lastUsedAt: new Date().toISOString() } : k
    ),
  };
  setServerChatPlatformState(next);
  if (typeof window !== "undefined") {
    mutateChatPlatformState(() => next);
  }

  return toPublicWidgetConfig(site);
}

export function syncPlatformStateToServer(state: ChatPlatformState): void {
  setServerChatPlatformState(state);
}

export function getServerSyncedState(): ChatPlatformState | null {
  return getServerChatPlatformState();
}
