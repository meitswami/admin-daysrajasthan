import { getModuleManifest } from "@/modules/shared";

export const moduleManifest = getModuleManifest("quotation");

export type {
  CreateDraftInput,
  CreateRevisionInput,
  GenerateFromKnowledgeInput,
  QuotationClient,
  QuotationEvent,
  QuotationEventHandler,
  QuotationEventType,
  QuotationId,
  QuotationListFilters,
  QuotationPriceLine,
  QuotationPricingSummary,
  QuotationRecord,
  QuotationRenderPayload,
  QuotationRevision,
  QuotationRevisionId,
  QuotationSnapshot,
  QuotationSource,
  QuotationStatus,
  TransitionInput,
} from "./types";

export {
  DEFAULT_QUOTATION_CURRENCY,
  DEFAULT_QUOTATION_EXPIRY_DAYS,
  QUOTATION_DEFAULT_LIST_LIMIT,
  QUOTATION_STATUSES,
  QUOTATION_TRANSITIONS,
  STATUS_TO_WORKFLOW,
} from "./constants";

export {
  createDraftInputSchema,
  createRevisionInputSchema,
  generateFromKnowledgeInputSchema,
  quotationListFiltersSchema,
  quotationSourceSchema,
  quotationStatusSchema,
  transitionInputSchema,
} from "./schemas";

export {
  assertTransitionAllowed,
  parseCreateDraftInput,
  parseCreateRevisionInput,
  parseGenerateFromKnowledgeInput,
  parseQuotationListFilters,
  parseTransitionInput,
} from "./validators";

export {
  emitQuotationEvent,
  listQuotationEvents,
  onQuotationEvent,
  resetQuotationEvents,
} from "./events";

export {
  acceptQuotation,
  buildQuotationRenderPayload,
  createDraftQuotation,
  createQuotationRevision,
  generateQuotationFromKnowledge,
  getQuotation,
  listQuotationRevisions,
  listQuotations,
  markQuotationSent,
  markQuotationViewed,
  rejectQuotation,
  transitionQuotationStatus,
} from "./service";

export {
  getPricingRateCard,
  listPriceLines,
  priceSnapshot,
  summarizePricing,
  type PricingAdjustmentInput,
} from "./pricing";
