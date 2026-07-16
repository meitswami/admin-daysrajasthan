/**
 * Chat turn orchestration — Gateway handler target.
 * Widget → Intelligence → Renderer (DTO only). Offline / AI / Disabled runtime modes.
 */

import { ModuleError } from "@/modules/shared";
import { runIntelligence } from "@/modules/intelligence";
import type { IntelligenceResult } from "@/modules/intelligence";
import { renderIntelligenceDto } from "@/modules/renderer";
import type { SearchHit } from "@/modules/search";

import { CHAT_MODULE_ID, LOCAL_DEMO_WIDGET_KEY_ALIASES } from "../constants";
import { ensureMockProviderRegistered } from "../mock-provider";
import { hashWidgetSecret } from "../keys";
import {
  ensureServerChatPlatformState,
  mutateServerChatPlatformState,
} from "../server-store";
import type {
  ChatAiMode,
  ChatMessageRecord,
  ChatSessionRecord,
  ChatTurnAnalytics,
  ChatWebsite,
  KnowledgeScopeConfig,
  PublicWidgetConfig,
} from "../types";

export type ChatTurnInput = {
  key: string;
  message: string;
  sessionId?: string | null;
  name?: string;
  email?: string;
};

export type ChatTurnResult = {
  mode: ChatAiMode;
  sessionId: string;
  replyText: string;
  /** Renderer JSON presentation blocks — never HTML/Markdown product contract */
  presentation: unknown[];
  intelligence: IntelligenceResult | null;
  analytics: ChatTurnAnalytics;
  offlineQueued?: boolean;
};

function isLocalDemoKey(secretKey: string): boolean {
  const k = secretKey.trim().toLowerCase();
  return LOCAL_DEMO_WIDGET_KEY_ALIASES.some((a) => a.toLowerCase() === k);
}

async function resolveWebsiteFromKey(secretKey: string): Promise<{
  site: ChatWebsite;
  config: PublicWidgetConfig;
} | null> {
  const state = ensureServerChatPlatformState();
  let site: ChatWebsite | undefined;

  if (isLocalDemoKey(secretKey)) {
    site =
      state.websites.find((w) => w.id === state.settings.defaultWebsiteId) ??
      state.websites[0];
  } else {
    const hash = await hashWidgetSecret(secretKey);
    const key = state.keys.find((k) => k.secretHash === hash && !k.revokedAt);
    if (!key) return null;
    site = state.websites.find((w) => w.id === key.websiteId);
  }

  if (!site) return null;

  const config: PublicWidgetConfig = {
    websiteId: site.id,
    websiteName: site.name,
    aiMode: site.aiMode,
    appearance: site.appearance,
    behaviour: site.behaviour,
    knowledgeScope: site.knowledgeScope,
    enabled: site.enabled,
    intelligenceEnabled: site.enabled && site.aiMode === "ai",
  };

  return { site, config };
}

function scopeRegionCode(scope: KnowledgeScopeConfig): string | null {
  const raw = scope.regionCodes[0];
  if (!raw) return null;
  const c = raw.trim().toLowerCase();
  if (["rajasthan", "rj", "in-rj", "in_rj"].includes(c)) return "IN-RJ";
  if (["himachal", "hp", "in-hp"].includes(c)) return "IN-HP";
  if (["goa", "in-ga", "ga"].includes(c)) return "IN-GA";
  return raw.trim();
}

/** Expand regional travel language so Search can match city package titles. */
function enrichTravelQuery(text: string): string {
  const lower = text.toLowerCase();
  const extras: string[] = [];
  const expansions: Record<string, string[]> = {
    rajasthan: ["jaipur", "udaipur", "jodhpur", "jaisalmer", "ranthambore", "pushkar", "heritage"],
    himachal: ["manali", "shimla", "dharamshala"],
    goa: ["goa beach", "north goa"],
  };
  for (const [region, cities] of Object.entries(expansions)) {
    if (lower.includes(region)) {
      for (const city of cities) {
        if (!lower.includes(city)) extras.push(city);
      }
    }
  }
  // Duration cues help match "3 Days …" packages
  if (/\b3\s*-?\s*days?\b/i.test(text) && !lower.includes("3 days")) {
    extras.push("3 Days");
  }
  if (!extras.length) return text;
  return `${text} ${extras.join(" ")}`;
}

function filterHitsByScope(hits: SearchHit[], scope: KnowledgeScopeConfig): SearchHit[] {
  const allowedRegions = scope.regionCodes
    .map((r) => (scopeRegionCode({ ...scope, regionCodes: [r] }) ?? r).toLowerCase())
    .filter(Boolean);

  return hits.filter((h) => {
    if (h.kind === "package" && !scope.includePackages) return false;
    if (h.kind === "destination" && !scope.includeDestinations) return false;
    if (h.kind === "knowledge" && !scope.includeFaqs && !scope.includeBlogs) return false;
    if (!allowedRegions.length) return true;

    const record =
      h.kind === "package" || h.kind === "destination"
        ? (h as { record?: { regionCode?: string | null; regionName?: string | null } }).record
        : undefined;
    const regionHay = [
      h.facets?.regionCode,
      h.facets?.region,
      record?.regionCode,
      record?.regionName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (!regionHay) return true; // no region metadata — keep hit
    return allowedRegions.some(
      (r) =>
        regionHay.includes(r) ||
        r.includes(regionHay) ||
        (r === "in-rj" && regionHay.includes("rajasthan")) ||
        (regionHay.includes("in-rj") && (r === "in-rj" || r.includes("rajasthan")))
    );
  });
}

function presentationToReplyText(presentation: unknown[]): string {
  let narrative: string | null = null;
  const packageLines: string[] = [];
  const destinationLines: string[] = [];

  for (const block of presentation) {
    if (!block || typeof block !== "object") continue;
    const b = block as Record<string, unknown>;
    const kind = b.kind;

    if (kind === "chat_message" && typeof b.text === "string" && b.text.trim()) {
      if (!narrative) narrative = stripInternalIds(b.text.trim());
      continue;
    }
    if (
      !narrative &&
      typeof b.body === "string" &&
      b.body.trim() &&
      (kind === "message" || kind === "summary" || kind === "fallback_browse")
    ) {
      narrative = stripInternalIds(b.body.trim());
      continue;
    }
    if (kind === "package_card") {
      const name = typeof b.name === "string" ? b.name : typeof b.title === "string" ? b.title : null;
      const summary =
        typeof b.summary === "string" ? b.summary : typeof b.subtitle === "string" ? b.subtitle : null;
      if (name) packageLines.push(summary ? `• ${name} — ${summary}` : `• ${name}`);
      continue;
    }
    if (kind === "destination_card") {
      const name = typeof b.name === "string" ? b.name : typeof b.title === "string" ? b.title : null;
      const summary =
        typeof b.summary === "string" ? b.summary : typeof b.subtitle === "string" ? b.subtitle : null;
      if (name) destinationLines.push(summary ? `• ${name} — ${summary}` : `• ${name}`);
    }
  }

  // Prefer the assistant narrative (already visitor-formatted). Fall back to card titles.
  if (narrative) return narrative;

  const sections: string[] = [];
  if (packageLines.length) sections.push(["Suggested packages:", ...packageLines].join("\n"));
  if (destinationLines.length) sections.push(["Destinations:", ...destinationLines].join("\n"));
  if (sections.length) return sections.join("\n\n");
  return "Here are grounded results from our catalog.";
}

/** Remove internal catalog ids from visitor-facing chat text. */
function stripInternalIds(text: string): string {
  return text
    .replace(/\bid[=:\s]+[a-zA-Z0-9_-]+\b/gi, "")
    .replace(/\bpackage[_-]?id\b[=:\s]*[a-zA-Z0-9_-]*/gi, "")
    .replace(/\[(package|destination|knowledge|quotation|customer|lead)\]\s*/gi, "")
    .replace(/\s*·\s*·\s*/g, " · ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

function ensureSession(input: {
  websiteId: string;
  sessionId?: string | null;
  visitorLabel: string;
  email: string | null;
  mode: ChatAiMode;
}): ChatSessionRecord {
  const state = ensureServerChatPlatformState();
  if (input.sessionId) {
    const existing = state.sessions.find((s) => s.id === input.sessionId);
    if (existing) return existing;
  }
  const session: ChatSessionRecord = {
    id: `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    websiteId: input.websiteId,
    visitorLabel: input.visitorLabel,
    email: input.email,
    mode: input.mode,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mutateServerChatPlatformState((s) => ({
    ...s,
    sessions: [session, ...s.sessions],
  }));
  return session;
}

function persistMessage(msg: ChatMessageRecord): void {
  mutateServerChatPlatformState((s) => ({
    ...s,
    messages: [msg, ...s.messages].slice(0, 500),
    conversations: [
      {
        id: `conv_${msg.sessionId}`,
        websiteId: msg.websiteId,
        channel: (msg.role === "assistant" && msg.provider ? "ai" : "manual") as
          | "ai"
          | "manual"
          | "widget",
        visitorLabel: "Visitor",
        status: "open" as const,
        messageCount: s.messages.filter((m) => m.sessionId === msg.sessionId).length + 1,
        lastMessagePreview: msg.text.slice(0, 120),
        createdAt: msg.createdAt,
        updatedAt: msg.createdAt,
        sessionId: msg.sessionId,
      },
      ...s.conversations.filter((c) => c.sessionId !== msg.sessionId),
    ].slice(0, 200),
  }));
}

function isConversationTurn(
  message: ChatMessageRecord
): message is ChatMessageRecord & { role: "user" | "assistant" } {
  return message.role === "user" || message.role === "assistant";
}

function buildConversationTurns(sessionId: string): { role: "user" | "assistant"; text: string }[] {
  return listSessionMessages(sessionId)
    .filter(isConversationTurn)
    .map((m) => ({
      role: m.role,
      text: m.text,
    }))
    .slice(-6);
}

function logAnalytics(entry: ChatTurnAnalytics): void {
  mutateServerChatPlatformState((s) => ({
    ...s,
    analyticsLog: [entry, ...s.analyticsLog].slice(0, 200),
  }));
}

/**
 * Primary chat turn — used by POST /api/chat.
 */
export async function processChatTurn(input: ChatTurnInput): Promise<ChatTurnResult> {
  const started = Date.now();
  ensureMockProviderRegistered();

  const resolved = await resolveWebsiteFromKey(input.key);
  if (!resolved) {
    throw new ModuleError(CHAT_MODULE_ID, "INVALID_KEY", "Invalid or revoked widget key");
  }

  const { site, config } = resolved;

  if (!config.enabled || config.aiMode === "disabled") {
    throw new ModuleError(CHAT_MODULE_ID, "WIDGET_DISABLED", "Chat widget is disabled");
  }

  const visitorLabel = input.name?.trim() || input.email?.trim() || "Visitor";
  const session = ensureSession({
    websiteId: site.id,
    sessionId: input.sessionId,
    visitorLabel,
    email: input.email?.trim() || null,
    mode: config.aiMode,
  });

  const userMsg: ChatMessageRecord = {
    id: `msg_${Date.now().toString(36)}_u`,
    sessionId: session.id,
    websiteId: site.id,
    role: "user",
    text: input.message.trim(),
    presentation: null,
    provider: null,
    usedFallback: false,
    searchHits: 0,
    latencyMs: 0,
    createdAt: new Date().toISOString(),
  };
  persistMessage(userMsg);

  // Offline mode — leave a message only
  if (config.aiMode === "offline") {
    const analytics: ChatTurnAnalytics = {
      responseTimeMs: Date.now() - started,
      usedFallback: false,
      searchHits: 0,
      providerUsed: "none",
      mode: "offline",
      sessionId: session.id,
    };
    logAnalytics(analytics);
    const replyText = site.behaviour.offlineMessage;
    const assistantMsg: ChatMessageRecord = {
      id: `msg_${Date.now().toString(36)}_a`,
      sessionId: session.id,
      websiteId: site.id,
      role: "assistant",
      text: replyText,
      presentation: [
        {
          kind: "chat_message",
          text: replyText,
          role: "assistant",
          title: null,
          subtitle: null,
          themeHints: {},
          a11yLabel: "Offline reply",
          refs: [],
          id: "offline_reply",
        },
      ],
      provider: null,
      usedFallback: false,
      searchHits: 0,
      latencyMs: analytics.responseTimeMs,
      createdAt: new Date().toISOString(),
    };
    persistMessage(assistantMsg);
    return {
      mode: "offline",
      sessionId: session.id,
      replyText,
      presentation: assistantMsg.presentation ?? [],
      intelligence: null,
      analytics,
      offlineQueued: true,
    };
  }

  // AI mode — Intelligence → Renderer
  const scope = site.knowledgeScope;
  const regionCode = scopeRegionCode(scope);
  const enrichedText = enrichTravelQuery(input.message.trim());
  const conversationTurns = buildConversationTurns(session.id);

  const intelligence = await runIntelligence({
    text: enrichedText,
    surface: "website",
    sessionId: session.id,
    locale: null,
    regionCode,
    preferredProvider: "local",
    conversationTurns,
    extras: {
      knowledgeScope: scope,
      websiteId: site.id,
      originalText: input.message.trim(),
    },
  });

  // Soft filter Search hits by Knowledge Scope before presentation
  const filteredHits = filterHitsByScope(intelligence.facts.hits, scope);
  const scopedIntelligence: IntelligenceResult = {
    ...intelligence,
    facts: { ...intelligence.facts, hits: filteredHits },
    blocks: intelligence.blocks,
  };

  const rendered = renderIntelligenceDto(
    { blocks: scopedIntelligence.blocks, traceId: scopedIntelligence.traceId },
    { outputType: "json", surface: "chat", mode: "light" }
  );

  const presentation = "blocks" in rendered ? rendered.blocks : [];
  const replyText = presentationToReplyText(presentation as unknown[]);

  const analytics: ChatTurnAnalytics = {
    responseTimeMs: Date.now() - started,
    usedFallback: scopedIntelligence.usedFallback,
    searchHits: filteredHits.length,
    providerUsed: scopedIntelligence.provider,
    mode: "ai",
    sessionId: session.id,
  };
  logAnalytics(analytics);

  const assistantMsg: ChatMessageRecord = {
    id: `msg_${Date.now().toString(36)}_a`,
    sessionId: session.id,
    websiteId: site.id,
    role: "assistant",
    text: replyText,
    presentation: presentation as unknown[],
    provider: scopedIntelligence.provider,
    usedFallback: scopedIntelligence.usedFallback,
    searchHits: filteredHits.length,
    latencyMs: analytics.responseTimeMs,
    createdAt: new Date().toISOString(),
  };
  persistMessage(assistantMsg);

  return {
    mode: "ai",
    sessionId: session.id,
    replyText,
    presentation: presentation as unknown[],
    intelligence: scopedIntelligence,
    analytics,
  };
}

export function listSessionMessages(sessionId: string): ChatMessageRecord[] {
  const state = ensureServerChatPlatformState();
  return state.messages
    .filter((m) => m.sessionId === sessionId)
    .slice()
    .reverse();
}
