import type {
  AiProviderSlot,
  ChatPlatformSettings,
  ChatWebsite,
  PromptTemplate,
  WidgetAppearance,
  WidgetBehaviour,
  KnowledgeScopeConfig,
} from "./types";

export const CHAT_MODULE_ID = "chat" as const;
export const CHAT_STORAGE_KEY = "travel-days-chat-platform-v1";
export const WIDGET_KEY_PREFIX = "tdw_live_";

/** Stable local-testing keys (admin preview + paste embeds). */
export const LOCAL_DEMO_WIDGET_KEY = "twd-live";
export const LOCAL_DEMO_WIDGET_KEY_ALIASES = [
  "twd-live",
  "tdw_live_localdev",
  "tdw_demo_local",
] as const;

export const DEFAULT_APPEARANCE: WidgetAppearance = {
  primaryColor: "#7A1F1F",
  accentColor: "#C9A227",
  launcherLabel: "Chat with us",
  launcherIcon: "chat",
  borderRadiusPx: 16,
  colorMode: "light",
  showBranding: true,
  welcomeTitle: "Travel Days",
  welcomeBody: "Ask about packages and destinations. Offline mode is on — leave a message anytime.",
};

export const DEFAULT_BEHAVIOUR: WidgetBehaviour = {
  autoOpen: false,
  autoOpenDelayMs: 0,
  greetOnFirstVisit: true,
  collectVisitorDetails: true,
  collectEmail: true,
  collectPhone: false,
  offlineMessage: "Thanks — we received your message and will reply shortly.",
  businessHoursNote: "Typically replies within a few business hours.",
  enableFileUpload: false,
  enableTypingIndicator: true,
};

export const DEFAULT_KNOWLEDGE_SCOPE: KnowledgeScopeConfig = {
  includePackages: true,
  includeDestinations: true,
  includeFaqs: true,
  includeBlogs: false,
  regionCodes: [],
  notes: "Scope applied when AI mode is enabled later.",
};

export const DEFAULT_PROVIDERS: AiProviderSlot[] = [
  {
    id: "prov_local",
    providerId: "local",
    label: "Mock Provider (local)",
    enabled: true,
    envKeyHint: null,
    priority: 0,
  },
  {
    id: "prov_hf",
    providerId: "huggingface",
    label: "HuggingFace",
    enabled: false,
    envKeyHint: "HF_TOKEN",
    priority: 1,
  },
  {
    id: "prov_gh",
    providerId: "github-models",
    label: "GitHub Models",
    enabled: false,
    envKeyHint: "GITHUB_TOKEN",
    priority: 2,
  },
  {
    id: "prov_or",
    providerId: "openrouter",
    label: "OpenRouter",
    enabled: false,
    envKeyHint: "OPENROUTER_API_KEY",
    priority: 3,
  },
  {
    id: "prov_none",
    providerId: "none",
    label: "None (offline / manual)",
    enabled: true,
    envKeyHint: null,
    priority: 99,
  },
];

export const DEFAULT_PROMPTS: PromptTemplate[] = [
  {
    id: "prompt_website",
    name: "Website widget (default)",
    surface: "website_widget",
    systemPrompt:
      "You are Travel Days assist. Use only retrieved catalog facts. Never invent prices.",
    enabled: true,
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_SETTINGS: ChatPlatformSettings = {
  defaultWebsiteId: null,
  requireAllowedDomain: true,
  allowIframeEmbed: true,
  publicApiBaseUrl: null,
};

export function createDefaultWebsite(partial?: Partial<ChatWebsite>): ChatWebsite {
  const now = new Date().toISOString();
  return {
    id: partial?.id ?? `site_${Date.now().toString(36)}`,
    name: partial?.name ?? "Primary Website",
    slug: partial?.slug ?? "primary",
    enabled: partial?.enabled ?? true,
    aiMode: partial?.aiMode ?? "ai",
    appearance: { ...DEFAULT_APPEARANCE, ...partial?.appearance },
    behaviour: { ...DEFAULT_BEHAVIOUR, ...partial?.behaviour },
    knowledgeScope: { ...DEFAULT_KNOWLEDGE_SCOPE, ...partial?.knowledgeScope },
    createdAt: partial?.createdAt ?? now,
    updatedAt: partial?.updatedAt ?? now,
  };
}

export const CHAT_PLATFORM_SECTIONS = [
  { id: "dashboard", label: "Dashboard", href: "/ai-chat" },
  { id: "widget", label: "Widget Settings", href: "/ai-chat/widget" },
  { id: "appearance", label: "Appearance", href: "/ai-chat/appearance" },
  { id: "behaviour", label: "Behaviour", href: "/ai-chat/behaviour" },
  { id: "embed", label: "Embed", href: "/ai-chat/embed" },
  { id: "api-keys", label: "API Keys", href: "/ai-chat/api-keys" },
  { id: "domains", label: "Allowed Domains", href: "/ai-chat/domains" },
  { id: "knowledge-scope", label: "Knowledge Scope", href: "/ai-chat/knowledge-scope" },
  { id: "providers", label: "AI Providers", href: "/ai-chat/providers" },
  { id: "prompts", label: "Prompt Management", href: "/ai-chat/prompts" },
  { id: "analytics", label: "Analytics", href: "/ai-chat/analytics" },
  { id: "conversations", label: "Conversations", href: "/ai-chat/conversations" },
  { id: "feedback", label: "Feedback", href: "/ai-chat/feedback" },
  { id: "settings", label: "Settings", href: "/ai-chat/settings" },
] as const;
