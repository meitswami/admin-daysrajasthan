/**
 * Universal Search Engine — normalized search DTOs.
 * Search never returns raw storage rows.
 */

import type {
  DestinationRecord,
  KnowledgeDomain,
  PackageRecord,
} from "@/modules/knowledge";
import type { CustomerRecord, LeadRecord } from "@/modules/customer-relations";
import type { QuotationRecord } from "@/modules/quotation";

export type SearchMatchMode =
  | "exact"
  | "prefix"
  | "contains"
  | "keyword"
  | "tag"
  | "category"
  | "region"
  | "semantic_future";

export type SearchHitKind =
  | "package"
  | "destination"
  | "knowledge"
  | "customer"
  | "lead"
  | "quotation"
  | "global";

export type TravelStyleFilter =
  | "family"
  | "couple"
  | "group"
  | "luxury"
  | "adventure"
  | "pilgrimage";

export type SearchFilters = {
  budgetMin?: number;
  budgetMax?: number;
  durationDaysMin?: number;
  durationDaysMax?: number;
  destination?: string;
  regionCode?: string;
  hotelCategory?: string;
  activityType?: string;
  travelStyle?: TravelStyleFilter;
  tags?: string[];
  category?: string;
  matchMode?: SearchMatchMode;
};

export type SearchPagination = {
  /** Offset page (1-based) */
  page?: number;
  pageSize?: number;
  /** Cursor for future cursor pagination */
  cursor?: string | null;
};

export type SearchQuery = {
  text: string;
  filters?: SearchFilters;
  pagination?: SearchPagination;
  limit?: number;
  kinds?: SearchHitKind[];
};

export type SearchHitBase = {
  id: string;
  kind: SearchHitKind;
  title: string;
  subtitle: string | null;
  score: number;
  href: string | null;
  matchMode: SearchMatchMode;
  highlights: string[];
  facets?: Record<string, string | number | boolean | null>;
};

export type PackageSearchHit = SearchHitBase & {
  kind: "package";
  record: PackageRecord;
};

export type DestinationSearchHit = SearchHitBase & {
  kind: "destination";
  record: DestinationRecord;
};

export type KnowledgeSearchHit = SearchHitBase & {
  kind: "knowledge";
  domain: KnowledgeDomain;
  recordId: string;
};

export type CustomerSearchHit = SearchHitBase & {
  kind: "customer";
  record: CustomerRecord;
};

export type LeadSearchHit = SearchHitBase & {
  kind: "lead";
  record: LeadRecord;
};

export type QuotationSearchHit = SearchHitBase & {
  kind: "quotation";
  record: QuotationRecord;
};

export type GlobalSearchHit = SearchHitBase & {
  kind: "global";
  sourceModule: string;
};

export type SearchHit =
  | PackageSearchHit
  | DestinationSearchHit
  | KnowledgeSearchHit
  | CustomerSearchHit
  | LeadSearchHit
  | QuotationSearchHit
  | GlobalSearchHit;

export type SearchFacetBucket = {
  key: string;
  label: string;
  count: number;
};

export type SearchFacets = {
  kinds: SearchFacetBucket[];
  regions: SearchFacetBucket[];
  travelStyles: SearchFacetBucket[];
};

export type SearchResult = {
  query: string;
  hits: SearchHit[];
  total: number;
  page: number;
  pageSize: number;
  nextCursor: string | null;
  facets: SearchFacets;
  retrievedAt: string;
  /** Future: hybrid / vector mode flags without API break */
  engineHints: {
    lexical: true;
    semanticReady: false;
    fullTextReady: false;
    hybridReady: false;
  };
};

export type SuggestionKind =
  | "prompt"
  | "destination"
  | "package"
  | "query"
  | "trending"
  | "recent"
  | "related"
  | "frequently_booked";

export type SuggestionItem = {
  id: string;
  kind: SuggestionKind;
  label: string;
  value: string;
  score: number;
  href: string | null;
};

export type SuggestionsResult = {
  query: string;
  items: SuggestionItem[];
  retrievedAt: string;
};

export type RankingWeights = {
  popularity: number;
  recency: number;
  businessWeight: number;
  featured: number;
  season: number;
  packageQuality: number;
  /** Reserved for future AI ranking blend */
  aiRanking: number;
};

export type RankableCandidate = {
  id: string;
  kind: SearchHitKind;
  title: string;
  text: string;
  popularity?: number;
  updatedAt?: string | null;
  featured?: boolean;
  businessWeight?: number;
  seasonBoost?: number;
  quality?: number;
};
