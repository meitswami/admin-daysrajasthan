/**
 * Chat Platform — management contracts + Intelligence-ready runtime modes.
 */

export type ChatAiMode = "offline" | "ai" | "disabled";

export type ChatColorMode = "light" | "dark" | "system";

export type ChatPosition = "bottom-right" | "bottom-left";

export type WidgetAppearance = {
  primaryColor: string;
  accentColor: string;
  launcherLabel: string;
  launcherIcon: "chat" | "message" | "sparkles";
  borderRadiusPx: number;
  colorMode: ChatColorMode;
  showBranding: boolean;
  welcomeTitle: string;
  welcomeBody: string;
};

export type WidgetBehaviour = {
  autoOpen: boolean;
  autoOpenDelayMs: number;
  greetOnFirstVisit: boolean;
  /** When true, ask for name/email before chat. When false, start with message only. */
  collectVisitorDetails: boolean;
  collectEmail: boolean;
  collectPhone: boolean;
  offlineMessage: string;
  businessHoursNote: string;
  enableFileUpload: boolean;
  enableTypingIndicator: boolean;
};

export type KnowledgeScopeConfig = {
  includePackages: boolean;
  includeDestinations: boolean;
  includeFaqs: boolean;
  includeBlogs: boolean;
  regionCodes: string[];
  notes: string;
};

export type AiProviderSlot = {
  id: string;
  providerId:
    | "huggingface"
    | "github-models"
    | "openrouter"
    | "openai"
    | "anthropic"
    | "azure"
    | "local"
    | "none";
  label: string;
  enabled: boolean;
  /** Secrets stay in env — only keyed reference stored */
  envKeyHint: string | null;
  priority: number;
};

export type PromptTemplate = {
  id: string;
  name: string;
  surface: "website_widget" | "admin" | "crm" | "whatsapp";
  systemPrompt: string;
  enabled: boolean;
  updatedAt: string;
};

export type WidgetApiKey = {
  id: string;
  /** Public prefix for display e.g. tdw_live_ab12 */
  prefix: string;
  /** Full secret shown once on create — not reloaded after */
  secretHint: string;
  /** SHA-256 hex of full key for verification */
  secretHash: string;
  label: string;
  websiteId: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export type AllowedDomain = {
  id: string;
  websiteId: string;
  origin: string;
  enabled: boolean;
};

export type ChatWebsite = {
  id: string;
  name: string;
  slug: string;
  enabled: boolean;
  aiMode: ChatAiMode;
  appearance: WidgetAppearance;
  behaviour: WidgetBehaviour;
  knowledgeScope: KnowledgeScopeConfig;
  createdAt: string;
  updatedAt: string;
};

/** How chat leads are routed to humans. */
export type ChatHandoffMode = "auto_human" | "admin_assign";

export type ChatHandoffStatus =
  | "ai"
  | "queued_human"
  | "offered"
  | "assigned"
  | "human_active"
  | "floating"
  | "escalated_admin";

export type ChatConversationStub = {
  id: string;
  websiteId: string;
  channel: "widget" | "manual" | "ai";
  visitorLabel: string;
  status: "open" | "closed" | "queued";
  messageCount: number;
  lastMessagePreview: string;
  createdAt: string;
  updatedAt: string;
  sessionId?: string | null;
  email?: string | null;
  /** All visitor queries captured for Superadmin inbox */
  queries?: string[];
  handoffStatus?: ChatHandoffStatus;
  assignedToTeamMemberId?: string | null;
  assignedToName?: string | null;
  assignedAt?: string | null;
  assignedBy?: string | null;
  /** When true, AI stops auto-replying — human agent owns the thread */
  humanTakeover?: boolean;
  /** Current offer target (must Accept within offerExpiresAt) */
  offeredToTeamMemberId?: string | null;
  offeredToName?: string | null;
  /** ISO deadline for Accept (20s window) */
  offerExpiresAt?: string | null;
  /** Agents who missed/declined this rotation */
  declinedByTeamMemberIds?: string[];
  /** When lead became claimable by any online agent */
  floatingAt?: string | null;
  /** When Superadmin was escalated because auto-accept timed out / no agents */
  escalatedToAdminAt?: string | null;
  adminNotifiedAt?: string | null;
};

export type ChatMessageRecord = {
  id: string;
  sessionId: string;
  websiteId: string;
  role: "user" | "assistant" | "system";
  text: string;
  /** Renderer presentation blocks (DTO only — never HTML) */
  presentation: unknown[] | null;
  provider: string | null;
  usedFallback: boolean;
  searchHits: number;
  latencyMs: number;
  createdAt: string;
};

export type ChatSessionRecord = {
  id: string;
  websiteId: string;
  visitorLabel: string;
  email: string | null;
  mode: ChatAiMode;
  createdAt: string;
  updatedAt: string;
};

export type ChatTurnAnalytics = {
  responseTimeMs: number;
  usedFallback: boolean;
  searchHits: number;
  providerUsed: string;
  mode: ChatAiMode;
  sessionId: string;
};

export type ChatFeedbackStub = {
  id: string;
  conversationId: string | null;
  websiteId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  createdAt: string;
};

export type ChatAnalyticsSnapshot = {
  websites: number;
  activeKeys: number;
  conversations: number;
  feedbackAvg: number | null;
  embedsGenerated: number;
  offlineModeSites: number;
};

export type ChatPlatformSettings = {
  defaultWebsiteId: string | null;
  requireAllowedDomain: boolean;
  allowIframeEmbed: boolean;
  publicApiBaseUrl: string | null;
  /** Persist every visitor query into Superadmin Conversations inbox */
  saveQueriesToSuperadmin: boolean;
  /**
   * auto_human — auto-assign chat lead to default agent
   * admin_assign — queue for Superadmin to assign a team member
   */
  handoffMode: ChatHandoffMode;
  /** Team member id used when handoffMode is auto_human */
  defaultAgentTeamMemberId: string | null;
  /** Seconds an offered agent has to Accept before rotation (default 20) */
  leadAcceptSeconds: number;
};

export type ChatPlatformState = {
  websites: ChatWebsite[];
  keys: WidgetApiKey[];
  domains: AllowedDomain[];
  providers: AiProviderSlot[];
  prompts: PromptTemplate[];
  conversations: ChatConversationStub[];
  feedback: ChatFeedbackStub[];
  sessions: ChatSessionRecord[];
  messages: ChatMessageRecord[];
  analyticsLog: ChatTurnAnalytics[];
  settings: ChatPlatformSettings;
  embedsGeneratedCount: number;
};

export type EmbedFormat =
  | "script"
  | "react"
  | "nextjs"
  | "iframe"
  | "api_endpoint";

export type EmbedSnippet = {
  format: EmbedFormat;
  label: string;
  language: string;
  code: string;
};

export type PublicWidgetConfig = {
  websiteId: string;
  websiteName: string;
  aiMode: ChatAiMode;
  appearance: WidgetAppearance;
  behaviour: WidgetBehaviour;
  knowledgeScope: KnowledgeScopeConfig;
  enabled: boolean;
  /** True when runtime mode is `ai` */
  intelligenceEnabled: boolean;
};

export type CreateWidgetKeyInput = {
  websiteId: string;
  label: string;
};

export type CreateWebsiteInput = {
  name: string;
  slug?: string;
};
