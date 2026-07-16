import type { RankingWeights, SearchHitKind } from "./types";

export const SEARCH_DEFAULT_PAGE_SIZE = 20;
export const SEARCH_DEFAULT_LIMIT = 20;
export const SEARCH_MAX_LIMIT = 100;

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  popularity: 0.25,
  recency: 0.2,
  businessWeight: 0.2,
  featured: 0.15,
  season: 0.1,
  packageQuality: 0.1,
  aiRanking: 0,
};

export const SEARCH_CACHE_PREFIX = {
  packages: "search:packages",
  destinations: "search:destinations",
  knowledge: "search:knowledge",
  customers: "search:customers",
  leads: "search:leads",
  quotations: "search:quotations",
  global: "search:global",
  suggestions: "search:suggestions",
} as const;

export const ALL_SEARCH_KINDS: SearchHitKind[] = [
  "package",
  "destination",
  "knowledge",
  "customer",
  "lead",
  "quotation",
];

/** Seed trending suggestion queries (region-agnostic labels). */
export const TRENDING_SEARCH_SEEDS = [
  "family packages",
  "honeymoon destinations",
  "desert safari",
  "heritage forts",
  "weekend getaway",
] as const;
