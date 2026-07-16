import { getModuleManifest } from "@/modules/shared";

export const moduleManifest = getModuleManifest("intelligence");

export type {
  ExtractedEntity,
  ExtractedEntityKind,
  GroundingIssue,
  IntelligenceBlock,
  IntelligenceBlockKind,
  IntelligenceContext,
  IntelligenceIntent,
  IntelligenceLogRecord,
  IntelligenceMetricSample,
  IntelligenceRequest,
  IntelligenceResult,
  IntelligenceSurface,
  PlannerDecision,
  PlannerNeeds,
  ProviderAdapter,
  ProviderId,
  ProviderMessage,
  ProviderPrompt,
  ProviderResult,
  RetrievedFacts,
  TravelMemoryProfile,
} from "./types";

export {
  AI_MAY,
  AI_MUST_NOT,
  DEFAULT_PROVIDER_ORDER,
  EMPTY_TRAVEL_MEMORY,
  INTELLIGENCE_CACHE_PREFIX,
  INTELLIGENCE_MODULE_ID,
  INTENT_CUES,
  MAX_PROMPT_FACT_CHARS,
  MAX_RETRIEVED_HITS,
} from "./constants";

export {
  conversationTurnSchema,
  extractedEntitySchema,
  intelligenceBlockSchema,
  intelligenceIntentSchema,
  intelligenceRequestSchema,
  intelligenceSurfaceSchema,
  providerIdSchema,
  travelMemoryProfileSchema,
} from "./schemas";

export { assertNoHtmlOrMarkdownContract, parseIntelligenceRequest } from "./validators";

export {
  defaultIntelligenceRepository,
  repoClearTravelMemory,
  repoGetTravelMemory,
  repoSaveTravelMemory,
  type IntelligenceRepository,
} from "./repository";

export {
  assistCrm,
  assistQuotation,
  assistWebsite,
  runIntelligence,
} from "./service";

export { SUBMODULE as planner } from "./planner";
export { planIntelligence } from "./planner";

export { SUBMODULE as orchestrator } from "./orchestrator";
export { retrieveViaSearch } from "./orchestrator";

export { SUBMODULE as contextBuilder } from "./context-builder";
export { buildIntelligenceContext, describeSurface } from "./context-builder";

export { SUBMODULE as promptBuilder } from "./prompt-builder";
export { buildProviderPrompt } from "./prompt-builder";

export { SUBMODULE as provider } from "./provider";
export {
  getProvider,
  listProviders,
  registerProvider,
  runProvider,
  selectProvider,
} from "./provider";

export { SUBMODULE as formatter } from "./formatter";
export { formatIntelligenceBlocks } from "./formatter";

export { SUBMODULE as validator } from "./validator";
export { validateIntelligenceBlocks } from "./validator";

export { SUBMODULE as parser } from "./parser";
export { parseProviderText } from "./parser";

export { SUBMODULE as memory } from "./memory";
export { clearTravelMemory, loadTravelMemory, upsertTravelMemory } from "./memory";

export { SUBMODULE as cache } from "./cache";
export {
  InMemoryIntelligenceCache,
  PassthroughIntelligenceCache,
  cacheKey,
  getIntelligenceCache,
  setIntelligenceCache,
  withIntelligenceCache,
  type IntelligenceCache,
} from "./cache";

export { SUBMODULE as logging } from "./logging";
export { logIntelligence, setIntelligenceLogger, type IntelligenceLogger } from "./logging";

export { SUBMODULE as telemetry } from "./telemetry";
export {
  endIntelligenceSpan,
  getIntelligenceMetricsSnapshot,
  recordIntelligenceMetric,
  startIntelligenceSpan,
} from "./telemetry";

export { SUBMODULE as safety } from "./safety";
export { applySafetyRails, safetyPolicySummary } from "./safety";
