/**
 * Chat Platform service — management only (no AI conversations).
 */

import { ModuleError } from "@/modules/shared";

import { CHAT_MODULE_ID, createDefaultWebsite } from "./constants";
import { generateEmbedSnippets } from "./embed";
import { generateWidgetSecret } from "./keys";
import { loadChatPlatformState, mutateChatPlatformState } from "./repository";
import type {
  AiProviderSlot,
  AllowedDomain,
  ChatAnalyticsSnapshot,
  ChatPlatformSettings,
  ChatPlatformState,
  ChatWebsite,
  CreateWebsiteInput,
  EmbedSnippet,
  KnowledgeScopeConfig,
  PromptTemplate,
  WidgetApiKey,
  WidgetAppearance,
  WidgetBehaviour,
} from "./types";
import {
  parseAllowedDomain,
  parseAppearance,
  parseBehaviour,
  parseCreateWebsite,
  parseCreateWidgetKey,
  parseKnowledgeScope,
} from "./validators";

export function getChatPlatformState(): ChatPlatformState {
  return loadChatPlatformState();
}

export function listWebsites(): ChatWebsite[] {
  return loadChatPlatformState().websites;
}

export function getDefaultWebsite(): ChatWebsite | null {
  const state = loadChatPlatformState();
  const id = state.settings.defaultWebsiteId;
  return state.websites.find((w) => w.id === id) ?? state.websites[0] ?? null;
}

export function createWebsite(input: unknown): ChatWebsite {
  const data = parseCreateWebsite(input) as CreateWebsiteInput;
  const slug =
    data.slug ??
    data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  const site = createDefaultWebsite({ name: data.name, slug });
  mutateChatPlatformState((s) => ({
    ...s,
    websites: [...s.websites, site],
    settings: {
      ...s.settings,
      defaultWebsiteId: s.settings.defaultWebsiteId ?? site.id,
    },
  }));
  return site;
}

export function updateWebsite(
  websiteId: string,
  patch: Partial<Pick<ChatWebsite, "name" | "enabled" | "aiMode">>
): ChatWebsite {
  let updated: ChatWebsite | null = null;
  mutateChatPlatformState((s) => ({
    ...s,
    websites: s.websites.map((w) => {
      if (w.id !== websiteId) return w;
      updated = {
        ...w,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      return updated;
    }),
  }));
  if (!updated) throw new ModuleError(CHAT_MODULE_ID, "SITE_NOT_FOUND", "Website not found");
  return updated;
}

export function updateAppearance(websiteId: string, appearance: unknown): ChatWebsite {
  const parsed = parseAppearance(appearance) as WidgetAppearance;
  return patchWebsiteConfig(websiteId, { appearance: parsed });
}

export function updateBehaviour(websiteId: string, behaviour: unknown): ChatWebsite {
  const parsed = parseBehaviour(behaviour) as WidgetBehaviour;
  return patchWebsiteConfig(websiteId, { behaviour: parsed });
}

export function updateKnowledgeScope(websiteId: string, scope: unknown): ChatWebsite {
  const parsed = parseKnowledgeScope(scope) as KnowledgeScopeConfig;
  return patchWebsiteConfig(websiteId, { knowledgeScope: parsed });
}

function patchWebsiteConfig(
  websiteId: string,
  patch: Partial<Pick<ChatWebsite, "appearance" | "behaviour" | "knowledgeScope">>
): ChatWebsite {
  let updated: ChatWebsite | null = null;
  mutateChatPlatformState((s) => ({
    ...s,
    websites: s.websites.map((w) => {
      if (w.id !== websiteId) return w;
      updated = { ...w, ...patch, updatedAt: new Date().toISOString() };
      return updated;
    }),
  }));
  if (!updated) throw new ModuleError(CHAT_MODULE_ID, "SITE_NOT_FOUND", "Website not found");
  return updated;
}

export async function createWidgetKey(input: unknown): Promise<{
  key: WidgetApiKey;
  secret: string;
}> {
  const data = parseCreateWidgetKey(input);
  const state = loadChatPlatformState();
  if (!state.websites.some((w) => w.id === data.websiteId)) {
    throw new ModuleError(CHAT_MODULE_ID, "SITE_NOT_FOUND", "Website not found");
  }
  const generated = await generateWidgetSecret();
  const key: WidgetApiKey = {
    id: `key_${Date.now().toString(36)}`,
    prefix: generated.prefix,
    secretHint: generated.secretHint,
    secretHash: generated.secretHash,
    label: data.label,
    websiteId: data.websiteId,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
    revokedAt: null,
  };
  mutateChatPlatformState((s) => ({ ...s, keys: [key, ...s.keys] }));
  return { key, secret: generated.secret };
}

export function revokeWidgetKey(keyId: string): void {
  mutateChatPlatformState((s) => ({
    ...s,
    keys: s.keys.map((k) =>
      k.id === keyId ? { ...k, revokedAt: new Date().toISOString() } : k
    ),
  }));
}

export function listWidgetKeys(websiteId?: string): WidgetApiKey[] {
  const keys = loadChatPlatformState().keys;
  return websiteId ? keys.filter((k) => k.websiteId === websiteId) : keys;
}

export function addAllowedDomain(input: unknown): AllowedDomain {
  const data = parseAllowedDomain(input);
  const domain: AllowedDomain = {
    id: `dom_${Date.now().toString(36)}`,
    websiteId: data.websiteId,
    origin: data.origin.replace(/\/$/, ""),
    enabled: data.enabled ?? true,
  };
  mutateChatPlatformState((s) => ({ ...s, domains: [...s.domains, domain] }));
  return domain;
}

export function removeAllowedDomain(domainId: string): void {
  mutateChatPlatformState((s) => ({
    ...s,
    domains: s.domains.filter((d) => d.id !== domainId),
  }));
}

export function listAllowedDomains(websiteId?: string): AllowedDomain[] {
  const domains = loadChatPlatformState().domains;
  return websiteId ? domains.filter((d) => d.websiteId === websiteId) : domains;
}

export function updateProviders(providers: AiProviderSlot[]): AiProviderSlot[] {
  mutateChatPlatformState((s) => ({ ...s, providers }));
  return providers;
}

export function updatePrompt(prompt: PromptTemplate): PromptTemplate {
  mutateChatPlatformState((s) => ({
    ...s,
    prompts: s.prompts.map((p) => (p.id === prompt.id ? { ...prompt, updatedAt: new Date().toISOString() } : p)),
  }));
  return prompt;
}

export function updatePlatformSettings(patch: Partial<ChatPlatformSettings>): ChatPlatformSettings {
  let next = loadChatPlatformState().settings;
  mutateChatPlatformState((s) => {
    next = { ...s.settings, ...patch };
    return { ...s, settings: next };
  });
  return next;
}

export function getAnalyticsSnapshot(): ChatAnalyticsSnapshot {
  const s = loadChatPlatformState();
  const ratings = s.feedback.map((f) => f.rating);
  return {
    websites: s.websites.length,
    activeKeys: s.keys.filter((k) => !k.revokedAt).length,
    conversations: s.conversations.length,
    feedbackAvg: ratings.length
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : null,
    embedsGenerated: s.embedsGeneratedCount,
    offlineModeSites: s.websites.filter((w) => w.aiMode === "offline").length,
  };
}

export function buildEmbedSnippets(input: {
  widgetKey: string;
  websiteId?: string;
}): EmbedSnippet[] {
  const state = loadChatPlatformState();
  mutateChatPlatformState((s) => ({
    ...s,
    embedsGeneratedCount: s.embedsGeneratedCount + 1,
  }));
  return generateEmbedSnippets({
    baseUrl: state.settings.publicApiBaseUrl,
    widgetKey: input.widgetKey,
  });
}

/** Manual offline conversation stub — no Intelligence. */
export function leaveOfflineMessage(input: {
  websiteId: string;
  visitorLabel: string;
  message: string;
  email?: string;
}): void {
  const preview = input.message.slice(0, 120);
  mutateChatPlatformState((s) => ({
    ...s,
    conversations: [
      {
        id: `conv_${Date.now().toString(36)}`,
        websiteId: input.websiteId,
        channel: "manual",
        visitorLabel: input.visitorLabel || input.email || "Visitor",
        status: "queued",
        messageCount: 1,
        lastMessagePreview: preview,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      ...s.conversations,
    ],
  }));
}

export function submitFeedbackStub(input: {
  websiteId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  conversationId?: string | null;
}): void {
  mutateChatPlatformState((s) => ({
    ...s,
    feedback: [
      {
        id: `fb_${Date.now().toString(36)}`,
        conversationId: input.conversationId ?? null,
        websiteId: input.websiteId,
        rating: input.rating,
        comment: input.comment,
        createdAt: new Date().toISOString(),
      },
      ...s.feedback,
    ],
  }));
}
