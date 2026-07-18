import { getModuleManifest } from "@/modules/shared";

export const moduleManifest = getModuleManifest("search");

export type {
  CustomerSearchHit,
  DestinationSearchHit,
  GlobalSearchHit,
  KnowledgeSearchHit,
  LeadSearchHit,
  PackageSearchHit,
  QuotationSearchHit,
  RankableCandidate,
  RankingWeights,
  SearchFacetBucket,
  SearchFacets,
  SearchFilters,
  SearchHit,
  SearchHitKind,
  SearchMatchMode,
  SearchPagination,
  SearchQuery,
  SearchResult,
  SuggestionItem,
  SuggestionKind,
  SuggestionsResult,
  TravelStyleFilter,
} from "./types";

export {
  ALL_SEARCH_KINDS,
  DEFAULT_RANKING_WEIGHTS,
  SEARCH_CACHE_PREFIX,
  SEARCH_DEFAULT_LIMIT,
  SEARCH_DEFAULT_PAGE_SIZE,
  SEARCH_MAX_LIMIT,
  TRENDING_SEARCH_SEEDS,
} from "./constants";

export {
  searchFiltersSchema,
  searchHitKindSchema,
  searchMatchModeSchema,
  searchPaginationSchema,
  searchQuerySchema,
  travelStyleFilterSchema,
} from "./schemas";

export { parseSearchQuery } from "./validators";

export {
  getSearchCache,
  PassthroughSearchCache,
  setSearchCache,
  withSearchCache,
  type SearchCache,
} from "./cache";

export { rankCandidates, scoreCandidate } from "./ranking";

export {
  extractHighlights,
  filterPackages,
  packageMatchesTravelStyle,
  parseDurationDays,
  parseDurationDaysFromQuery,
  textMatches,
} from "./filters";

export {
  autocomplete,
  emptySearchFacets,
  getSuggestions,
  searchAdmin,
  searchCustomers,
  searchDestinations,
  searchForAiContext,
  searchGlobal,
  searchKnowledge,
  searchLeads,
  searchPackages,
  searchQuotations,
} from "./service";

export { SUBMODULE as packageSearch } from "./package-search";
export { SUBMODULE as destinationSearch } from "./destination-search";
export { SUBMODULE as knowledgeSearch } from "./knowledge-search";
export { SUBMODULE as customerSearch } from "./customer-search";
export { SUBMODULE as quotationSearch } from "./quotation-search";
export { SUBMODULE as leadSearch } from "./lead-search";
export { SUBMODULE as globalSearch } from "./global-search";
export { SUBMODULE as suggestions } from "./suggestions";
