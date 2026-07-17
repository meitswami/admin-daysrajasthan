import { getModuleManifest } from "@/modules/shared";

export const moduleManifest = getModuleManifest("chat");

export type {
  AiProviderSlot,
  AllowedDomain,
  ChatAiMode,
  ChatAnalyticsSnapshot,
  ChatConversationStub,
  ChatFeedbackStub,
  ChatHandoffMode,
  ChatHandoffStatus,
  ChatMessageRecord,
  ChatPlatformSettings,
  ChatPlatformState,
  ChatSessionRecord,
  ChatTurnAnalytics,
  ChatWebsite,
  CreateWebsiteInput,
  CreateWidgetKeyInput,
  EmbedFormat,
  EmbedSnippet,
  KnowledgeScopeConfig,
  PromptTemplate,
  PublicWidgetConfig,
  WidgetApiKey,
  WidgetAppearance,
  WidgetBehaviour,
} from "./types";

export {
  CHAT_MODULE_ID,
  CHAT_PLATFORM_SECTIONS,
  CHAT_STORAGE_KEY,
  DEFAULT_APPEARANCE,
  DEFAULT_BEHAVIOUR,
  DEFAULT_KNOWLEDGE_SCOPE,
  DEFAULT_PROVIDERS,
  DEFAULT_PROMPTS,
  DEFAULT_SETTINGS,
  LEAD_ACCEPT_SECONDS_DEFAULT,
  LOCAL_DEMO_WIDGET_KEY,
  LOCAL_DEMO_WIDGET_KEY_ALIASES,
  TEAM_ONLINE_TTL_MS,
  WIDGET_KEY_PREFIX,
  createDefaultWebsite,
} from "./constants";

export {
  allowedDomainSchema,
  chatAiModeSchema,
  chatRequestSchema,
  createWebsiteSchema,
  createWidgetKeySchema,
  embedFormatSchema,
  knowledgeScopeSchema,
  widgetAppearanceSchema,
  widgetBehaviourSchema,
} from "./schemas";

export {
  parseAllowedDomain,
  parseAppearance,
  parseBehaviour,
  parseCreateWebsite,
  parseCreateWidgetKey,
  parseKnowledgeScope,
} from "./validators";

export {
  addAllowedDomain,
  buildEmbedSnippets,
  createWebsite,
  createWidgetKey,
  getAnalyticsSnapshot,
  getChatPlatformState,
  getDefaultWebsite,
  getServerSyncedState,
  leaveOfflineMessage,
  listAllowedDomains,
  listWebsites,
  listWidgetKeys,
  removeAllowedDomain,
  resolvePublicWidgetConfig,
  revokeWidgetKey,
  submitFeedbackStub,
  syncPlatformStateToServer,
  updateAppearance,
  updateBehaviour,
  updateKnowledgeScope,
  updatePlatformSettings,
  updatePrompt,
  updateProviders,
  updateWebsite,
} from "./service";

export { generateEmbedSnippets, getEmbedSnippet, resolvePublicBaseUrl } from "./embed";
export { generateWidgetSecret, hashWidgetSecret } from "./keys";

export { SUBMODULE as widget } from "./widget";
export { SUBMODULE as conversation } from "./conversation";
export { SUBMODULE as sessions } from "./sessions";
export { SUBMODULE as history } from "./history";
export { SUBMODULE as feedback } from "./feedback";
export { SUBMODULE as keys } from "./keys";
export { SUBMODULE as embed } from "./embed";
