/**
 * Chat turn orchestration — Gateway handler target.
 * Widget → Intelligence → Renderer (DTO only). Offline / AI / Disabled runtime modes.
 * Superadmin inbox + human handoff assignment.
 */

import { ModuleError } from "@/modules/shared";
import { runIntelligence } from "@/modules/intelligence";
import type { IntelligenceResult, ProviderId } from "@/modules/intelligence";
import { renderIntelligenceDto } from "@/modules/renderer";
import type { SearchHit } from "@/modules/search";
import { createAssignment } from "@/modules/customer-relations";
import { DEMO_TEAM } from "@/lib/rbac/current-user";

import { CHAT_MODULE_ID, LOCAL_DEMO_WIDGET_KEY_ALIASES } from "../constants";
import { ensureLocalProviderRegistered } from "../local-provider";
import { hashWidgetSecret } from "../keys";
import { startLeadOffer } from "../lead-routing";
import {
  ensureServerChatPlatformState,
  mutateServerChatPlatformState,
} from "../server-store";
import { hasProviderApiKey, syncProviderConfigFromSlots } from "@/modules/intelligence";
import { persistWorkflowTrace } from "../workflow-persist";
import {
  WorkflowTracer,
  buildPackageSummaries,
  type ChatWorkflowTrace,
} from "../workflow-trace";
import type {
  ChatAiMode,
  ChatConversationStub,
  ChatHandoffStatus,
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
  humanTakeover?: boolean;
  /** Present only when Settings → Testing workflow trace is ON */
  workflow?: ChatWorkflowTrace | null;
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
  // Catalog titles use padded day counts ("05 Days …"); keep both forms for matching.
  const dayMatch = text.match(/\b(\d{1,2})\s*-?\s*days?\b/i);
  if (dayMatch) {
    const n = Number(dayMatch[1]);
    if (Number.isFinite(n) && n > 0) {
      extras.push(`${n} Days`, `${String(n).padStart(2, "0")} Days`);
    }
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

    if (!regionHay) return true;
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

  if (narrative) return narrative;

  const sections: string[] = [];
  if (packageLines.length) sections.push(["Suggested packages:", ...packageLines].join("\n"));
  if (destinationLines.length) sections.push(["Destinations:", ...destinationLines].join("\n"));
  if (sections.length) return sections.join("\n\n");
  return "Here are grounded results from our catalog.";
}

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

function resolveTeamMember(id: string | null | undefined) {
  if (!id) return null;
  return DEMO_TEAM.find((m) => m.id === id && m.is_active) ?? null;
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

function persistMessage(
  msg: ChatMessageRecord,
  opts?: {
    visitorLabel?: string;
    email?: string | null;
    saveQuery?: boolean;
  }
): ChatConversationStub {
  let saved!: ChatConversationStub;
  mutateServerChatPlatformState((s) => {
    const settings = s.settings;
    const prev = s.conversations.find((c) => c.sessionId === msg.sessionId);
    const session = s.sessions.find((x) => x.id === msg.sessionId);
    const queries =
      msg.role === "user" && (opts?.saveQuery ?? settings.saveQueriesToSuperadmin)
        ? [...(prev?.queries ?? []), msg.text].slice(-50)
        : prev?.queries ?? [];

    let handoffStatus: ChatHandoffStatus = prev?.handoffStatus ?? "ai";
    let assignedToTeamMemberId = prev?.assignedToTeamMemberId ?? null;
    let assignedToName = prev?.assignedToName ?? null;
    let assignedAt = prev?.assignedAt ?? null;
    let assignedBy = prev?.assignedBy ?? null;
    let humanTakeover = prev?.humanTakeover ?? false;
    let status = prev?.status ?? ("open" as const);
    let offeredToTeamMemberId = prev?.offeredToTeamMemberId ?? null;
    let offeredToName = prev?.offeredToName ?? null;
    let offerExpiresAt = prev?.offerExpiresAt ?? null;
    let declinedByTeamMemberIds = prev?.declinedByTeamMemberIds ?? [];
    let floatingAt = prev?.floatingAt ?? null;
    let escalatedToAdminAt = prev?.escalatedToAdminAt ?? null;
    let adminNotifiedAt = prev?.adminNotifiedAt ?? null;

    saved = {
      id: prev?.id ?? `conv_${msg.sessionId}`,
      websiteId: msg.websiteId,
      channel: (msg.role === "assistant" && msg.provider
        ? "ai"
        : prev?.channel ?? "widget") as ChatConversationStub["channel"],
      visitorLabel: opts?.visitorLabel || prev?.visitorLabel || session?.visitorLabel || "Visitor",
      email: opts?.email ?? prev?.email ?? session?.email ?? null,
      status,
      messageCount: s.messages.filter((m) => m.sessionId === msg.sessionId).length + 1,
      lastMessagePreview: msg.text.slice(0, 160),
      createdAt: prev?.createdAt ?? msg.createdAt,
      updatedAt: msg.createdAt,
      sessionId: msg.sessionId,
      queries,
      handoffStatus,
      assignedToTeamMemberId,
      assignedToName,
      assignedAt,
      assignedBy,
      humanTakeover,
      offeredToTeamMemberId,
      offeredToName,
      offerExpiresAt,
      declinedByTeamMemberIds,
      floatingAt,
      escalatedToAdminAt,
      adminNotifiedAt,
    };

    // First visitor message → start offer / admin queue with 20s accept routing
    if (msg.role === "user" && !prev) {
      saved = startLeadOffer(saved);
    }

    return {
      ...s,
      messages: [msg, ...s.messages].slice(0, 500),
      conversations: [saved, ...s.conversations.filter((c) => c.sessionId !== msg.sessionId)].slice(
        0,
        200
      ),
    };
  });

  // Fire-and-forget CRP assignment when auto-offered on first message
  if (
    msg.role === "user" &&
    saved.offeredToTeamMemberId &&
    saved.assignedBy === "system:auto_human" &&
    (saved.queries?.length ?? 0) === 1
  ) {
    void createAssignment({
      entityType: "inquiry",
      entityId: saved.id,
      assignedTo: saved.offeredToName || saved.offeredToTeamMemberId,
      assignedBy: "chat-platform",
      priority: "medium",
      note: `Website chat lead offered (20s accept): ${saved.visitorLabel}${saved.email ? ` <${saved.email}>` : ""}`,
    }).catch(() => undefined);
  }

  return saved;
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

function preferredLocalProvider(): ProviderId {
  const state = ensureServerChatPlatformState();
  const ranked = state.providers
    .filter((p) => p.providerId !== "none")
    .sort((a, b) => a.priority - b.priority);

  // Prefer enabled cloud providers that already have a key (UI or env)
  for (const p of ranked) {
    if (!p.enabled || p.providerId === "local") continue;
    if (hasProviderApiKey(p.providerId as ProviderId)) {
      return p.providerId as ProviderId;
    }
  }

  // Auto-pick any cloud provider with an env/stored key even if slot was left disabled
  for (const p of ranked) {
    if (p.providerId === "local") continue;
    if (hasProviderApiKey(p.providerId as ProviderId)) {
      return p.providerId as ProviderId;
    }
  }

  const enabled = ranked.filter((p) => p.enabled);
  const first = enabled[0]?.providerId;
  return (first as ProviderId) || "local";
}

function getConversationBySession(sessionId: string): ChatConversationStub | undefined {
  return ensureServerChatPlatformState().conversations.find((c) => c.sessionId === sessionId);
}

/**
 * Primary chat turn — used by POST /api/chat.
 */
export async function processChatTurn(input: ChatTurnInput): Promise<ChatTurnResult> {
  const started = Date.now();
  const platform = ensureServerChatPlatformState();
  const traceEnabled = platform.settings.testingWorkflowTrace === true;
  const tracer = traceEnabled ? new WorkflowTracer() : null;

  ensureLocalProviderRegistered();
  // Hot-reload provider enablement/priority/models from Super Admin (no restart)
  syncProviderConfigFromSlots(
    platform.providers.map((p) => ({
      providerId: p.providerId,
      enabled: p.enabled,
      priority: p.priority,
      modelId: p.modelId ?? null,
    }))
  );

  const resolved = await resolveWebsiteFromKey(input.key);
  if (!resolved) {
    tracer?.mark("resolve_widget_key", "error", "Invalid or revoked widget key");
    throw new ModuleError(CHAT_MODULE_ID, "INVALID_KEY", "Invalid or revoked widget key");
  }
  tracer?.mark("resolve_widget_key", "ok", `website=${resolved.site.name}`, {
    websiteId: resolved.site.id,
    aiMode: resolved.config.aiMode,
  });

  const { site, config } = resolved;

  if (!config.enabled || config.aiMode === "disabled") {
    tracer?.mark("widget_gate", "error", "Widget disabled");
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
  tracer?.mark("ensure_session", "ok", `session=${session.id}`);

  // Prior turns only (before this message) — used for follow-up LLM routing
  const priorTurns = buildConversationTurns(session.id);

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
  const conversation = persistMessage(userMsg, {
    visitorLabel,
    email: input.email?.trim() || null,
    saveQuery: true,
  });
  tracer?.mark("persist_user_message", "ok", undefined, {
    messageId: userMsg.id,
    conversationId: conversation.id,
  });

  const finishTrace = async (partial: {
    replyText: string;
    provider: string | null;
    intent?: string | null;
    usedFallback?: boolean;
    hits?: SearchHit[];
    intelligenceTraceId?: string | null;
    messageId?: string | null;
  }): Promise<ChatWorkflowTrace | null> => {
    if (!tracer) return null;
    const packageSummaries = buildPackageSummaries(partial.hits ?? []);
    const providerSlot = platform.providers.find((p) => p.providerId === partial.provider);
    tracer.mark("complete", "ok", `total=${Date.now() - started}ms`);
    const trace: ChatWorkflowTrace = {
      id: tracer.id,
      sessionId: session.id,
      conversationId: conversation.id,
      websiteId: site.id,
      messageId: partial.messageId ?? userMsg.id,
      userMessage: input.message.trim(),
      replyPreview: partial.replyText.slice(0, 280),
      provider: partial.provider,
      modelId: providerSlot?.modelId ?? null,
      intent: partial.intent ?? null,
      usedFallback: partial.usedFallback ?? false,
      aiMode: config.aiMode,
      packageHitCount: packageSummaries.length,
      totalHitCount: (partial.hits ?? []).length,
      packageIds: packageSummaries.map((p) => p.package_id),
      packageSummaries,
      steps: tracer.steps,
      durationMs: Date.now() - started,
      traceId: partial.intelligenceTraceId ?? tracer.id,
      createdAt: tracer.createdAt,
    };
    void persistWorkflowTrace(trace);
    return trace;
  };

  // Human agent owns the thread — queue visitor message, no AI reply
  if (conversation.humanTakeover) {
    tracer?.mark("route", "skip", "human_takeover");
    const replyText =
      "Thanks — a Travel Days agent has this chat and will reply to you shortly.";
    const analytics: ChatTurnAnalytics = {
      responseTimeMs: Date.now() - started,
      usedFallback: false,
      searchHits: 0,
      providerUsed: "human",
      mode: config.aiMode,
      sessionId: session.id,
    };
    logAnalytics(analytics);
    const workflow = await finishTrace({
      replyText,
      provider: "human",
      intent: "human_handoff",
    });
    return {
      mode: config.aiMode,
      sessionId: session.id,
      replyText,
      presentation: [
        {
          kind: "chat_message",
          text: replyText,
          role: "assistant",
          title: null,
          subtitle: null,
          themeHints: {},
          a11yLabel: "Human handoff",
          refs: [],
          id: "human_handoff",
        },
      ],
      intelligence: null,
      analytics,
      humanTakeover: true,
      workflow,
    };
  }

  // Offline mode — leave a message only
  if (config.aiMode === "offline") {
    tracer?.mark("route", "skip", "offline_leave_message");
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
    persistMessage(assistantMsg, { visitorLabel, email: input.email?.trim() || null });
    const workflow = await finishTrace({
      replyText,
      provider: "none",
      intent: "offline",
      messageId: assistantMsg.id,
    });
    return {
      mode: "offline",
      sessionId: session.id,
      replyText,
      presentation: assistantMsg.presentation ?? [],
      intelligence: null,
      analytics,
      offlineQueued: true,
      workflow,
    };
  }

  // AI mode — Intelligence → Renderer (Ollama/local when available)
  tracer?.mark("route", "ok", "ai_path");
  const scope = site.knowledgeScope;
  const regionCode = scopeRegionCode(scope);
  const enrichedText = enrichTravelQuery(input.message.trim());
  const conversationTurns = priorTurns;
  const preferred = preferredLocalProvider();
  tracer?.mark("select_provider", "ok", preferred, {
    preferredProvider: preferred,
    hasKey: preferred === "local" ? true : hasProviderApiKey(preferred),
  });

  const intelligenceStarted = Date.now();
  const intelligence = await runIntelligence({
    text: enrichedText,
    surface: "website",
    sessionId: session.id,
    locale: null,
    regionCode,
    preferredProvider: preferred,
    conversationTurns,
    extras: {
      knowledgeScope: scope,
      websiteId: site.id,
      originalText: input.message.trim(),
    },
  });
  tracer?.mark(
    "run_intelligence",
    intelligence.success ? "ok" : "error",
    `provider=${intelligence.provider} intent=${intelligence.intent}`,
    {
      provider: intelligence.provider,
      intent: intelligence.intent,
      usedFallback: intelligence.usedFallback,
      durationMs: Date.now() - intelligenceStarted,
      warnings: intelligence.warnings.slice(0, 5),
      rawHitCount: intelligence.facts.hits.length,
    }
  );

  const filteredHits = filterHitsByScope(intelligence.facts.hits, scope);
  const packageSummaries = buildPackageSummaries(filteredHits);
  tracer?.mark(
    "filter_knowledge_scope",
    "ok",
    `${filteredHits.length} hits · ${packageSummaries.length} packages`,
    {
      totalHits: filteredHits.length,
      packageHitCount: packageSummaries.length,
      packageIds: packageSummaries.map((p) => p.package_id),
      includePackages: scope.includePackages,
      includeDestinations: scope.includeDestinations,
    }
  );

  const scopedIntelligence: IntelligenceResult = {
    ...intelligence,
    facts: { ...intelligence.facts, hits: filteredHits },
    blocks: intelligence.blocks,
  };

  const rendered = renderIntelligenceDto(
    { blocks: scopedIntelligence.blocks, traceId: scopedIntelligence.traceId },
    { outputType: "json", surface: "chat", mode: "light" }
  );
  tracer?.mark("render_reply", "ok");

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
  persistMessage(assistantMsg, { visitorLabel, email: input.email?.trim() || null });
  tracer?.mark("persist_assistant_message", "ok", assistantMsg.id);

  const workflow = await finishTrace({
    replyText,
    provider: scopedIntelligence.provider,
    intent: scopedIntelligence.intent,
    usedFallback: scopedIntelligence.usedFallback,
    hits: filteredHits,
    intelligenceTraceId: scopedIntelligence.traceId,
    messageId: assistantMsg.id,
  });

  return {
    mode: "ai",
    sessionId: session.id,
    replyText,
    presentation: presentation as unknown[],
    intelligence: scopedIntelligence,
    analytics,
    humanTakeover: false,
    workflow,
  };
}

export function listSessionMessages(sessionId: string): ChatMessageRecord[] {
  const state = ensureServerChatPlatformState();
  return state.messages
    .filter((m) => m.sessionId === sessionId)
    .slice()
    .reverse();
}

/** Superadmin / agent assigns a conversation to a team member. */
export function assignConversationToAgent(input: {
  conversationId: string;
  teamMemberId: string;
  assignedBy: string;
  takeOver?: boolean;
}): ChatConversationStub {
  const member = resolveTeamMember(input.teamMemberId);
  if (!member) {
    throw new ModuleError(CHAT_MODULE_ID, "AGENT_NOT_FOUND", "Team member not found");
  }

  const state = ensureServerChatPlatformState();
  const existing = state.conversations.find((c) => c.id === input.conversationId);
  if (!existing) {
    throw new ModuleError(CHAT_MODULE_ID, "CONVERSATION_NOT_FOUND", "Conversation not found");
  }

  const updated: ChatConversationStub = {
    ...existing,
    status: "open",
    handoffStatus: input.takeOver === false ? "assigned" : "human_active",
    humanTakeover: input.takeOver !== false,
    assignedToTeamMemberId: member.id,
    assignedToName: member.name,
    assignedAt: new Date().toISOString(),
    assignedBy: input.assignedBy,
    updatedAt: new Date().toISOString(),
  };

  mutateServerChatPlatformState((s) => ({
    ...s,
    conversations: s.conversations.map((c) => (c.id === input.conversationId ? updated : c)),
  }));

  void createAssignment({
    entityType: "inquiry",
    entityId: updated.id,
    assignedTo: member.name,
    assignedBy: input.assignedBy,
    priority: "high",
    note: `Chat conversation assigned to ${member.name}`,
  }).catch(() => undefined);

  return updated;
}

/** Human agent reply into an existing session (Superadmin inbox). */
export function postAgentReply(input: {
  sessionId: string;
  text: string;
  agentName: string;
}): ChatMessageRecord {
  const state = ensureServerChatPlatformState();
  const session = state.sessions.find((s) => s.id === input.sessionId);
  if (!session) {
    throw new ModuleError(CHAT_MODULE_ID, "SESSION_NOT_FOUND", "Session not found");
  }
  const msg: ChatMessageRecord = {
    id: `msg_${Date.now().toString(36)}_agent`,
    sessionId: input.sessionId,
    websiteId: session.websiteId,
    role: "assistant",
    text: input.text.trim(),
    presentation: [
      {
        kind: "chat_message",
        text: input.text.trim(),
        role: "assistant",
        title: input.agentName,
        subtitle: null,
        themeHints: {},
        a11yLabel: `Agent ${input.agentName}`,
        refs: [],
        id: "agent_reply",
      },
    ],
    provider: "human",
    usedFallback: false,
    searchHits: 0,
    latencyMs: 0,
    createdAt: new Date().toISOString(),
  };
  persistMessage(msg, { visitorLabel: session.visitorLabel, email: session.email });
  mutateServerChatPlatformState((s) => ({
    ...s,
    conversations: s.conversations.map((c) =>
      c.sessionId === input.sessionId
        ? {
            ...c,
            humanTakeover: true,
            handoffStatus: "human_active" as const,
            channel: "manual" as const,
            updatedAt: new Date().toISOString(),
          }
        : c
    ),
  }));
  return msg;
}

export function getConversationForSession(sessionId: string) {
  return getConversationBySession(sessionId);
}
