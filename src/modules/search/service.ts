/**
 * Universal Search Engine — ranking, filtering, aggregation, deduplication.
 * Never queries Supabase; loads via Knowledge / CRP / Quotation repositories.
 */

import type { KnowledgeDomain } from "@/modules/knowledge";

import {
  ALL_SEARCH_KINDS,
  SEARCH_DEFAULT_LIMIT,
  SEARCH_DEFAULT_PAGE_SIZE,
  TRENDING_SEARCH_SEEDS,
} from "./constants";
import {
  extractHighlights,
  filterPackages,
  textMatches,
} from "./filters";
import { rankCandidates } from "./ranking";
import {
  repoLoadCustomers,
  repoLoadDestinations,
  repoLoadKnowledgeBundle,
  repoLoadLeads,
  repoLoadPackages,
  repoLoadQuotations,
} from "./repository";
import type {
  CustomerSearchHit,
  DestinationSearchHit,
  KnowledgeSearchHit,
  LeadSearchHit,
  PackageSearchHit,
  QuotationSearchHit,
  SearchFacets,
  SearchHit,
  SearchMatchMode,
  SearchQuery,
  SearchResult,
  SuggestionItem,
  SuggestionsResult,
} from "./types";
import { parseSearchQuery } from "./validators";

function resolveMode(query: SearchQuery): SearchMatchMode {
  return query.filters?.matchMode ?? (query.text.trim() ? "contains" : "contains");
}

function resolvePage(query: SearchQuery): { page: number; pageSize: number } {
  const pageSize =
    query.pagination?.pageSize ?? query.limit ?? SEARCH_DEFAULT_PAGE_SIZE;
  const page = query.pagination?.page ?? 1;
  return { page, pageSize: Math.min(pageSize, SEARCH_DEFAULT_LIMIT * 5) };
}

function paginate<T>(items: T[], page: number, pageSize: number): {
  slice: T[];
  total: number;
  nextCursor: string | null;
} {
  const total = items.length;
  const start = (page - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);
  const nextCursor =
    start + pageSize < total ? String(page + 1) : null;
  return { slice, total, nextCursor };
}

function emptyFacets(): SearchFacets {
  return { kinds: [], regions: [], travelStyles: [] };
}

function buildFacets(hits: SearchHit[]): SearchFacets {
  const kindCounts = new Map<string, number>();
  const regionCounts = new Map<string, number>();
  for (const hit of hits) {
    kindCounts.set(hit.kind, (kindCounts.get(hit.kind) ?? 0) + 1);
    const region =
      hit.kind === "package"
        ? hit.record.regionCode
        : hit.kind === "destination"
          ? hit.record.regionCode
          : hit.kind === "quotation"
            ? hit.record.regionCode
            : null;
    if (region) regionCounts.set(region, (regionCounts.get(region) ?? 0) + 1);
  }
  return {
    kinds: [...kindCounts.entries()].map(([key, count]) => ({
      key,
      label: key,
      count,
    })),
    regions: [...regionCounts.entries()].map(([key, count]) => ({
      key,
      label: key,
      count,
    })),
    travelStyles: [],
  };
}

function resultOf(
  query: SearchQuery,
  hits: SearchHit[],
  page: number,
  pageSize: number
): SearchResult {
  const { slice, total, nextCursor } = paginate(hits, page, pageSize);
  return {
    query: query.text,
    hits: slice,
    total,
    page,
    pageSize,
    nextCursor,
    facets: buildFacets(hits),
    retrievedAt: new Date().toISOString(),
    engineHints: {
      lexical: true,
      semanticReady: false,
      fullTextReady: false,
      hybridReady: false,
    },
  };
}

/**
 * Search website packages via Knowledge Engine.
 */
export async function searchPackages(input: SearchQuery | string): Promise<SearchResult> {
  const query = parseSearchQuery(typeof input === "string" ? { text: input } : input);
  const mode = resolveMode(query);
  const { page, pageSize } = resolvePage(query);
  const packages = filterPackages(
    await repoLoadPackages(query.filters?.regionCode),
    query.filters
  );

  const matched = packages.filter((pkg) =>
    textMatches(
      `${pkg.name} ${pkg.destination ?? ""} ${pkg.packageType ?? ""}`,
      query.text,
      mode
    )
  );

  const ranked = rankCandidates(
    matched.map((pkg) => ({
      id: pkg.id,
      kind: "package" as const,
      title: pkg.name,
      text: `${pkg.name} ${pkg.destination ?? ""}`,
      popularity: pkg.downloadCount,
      updatedAt: pkg.updatedAt,
      featured: pkg.isTrending ?? false,
      businessWeight: pkg.showOnWebsite ? 0.8 : 0.4,
      quality: pkg.status === "active" ? 0.8 : 0.3,
    }))
  );

  const hits: PackageSearchHit[] = ranked.map((r) => {
    const pkg = matched.find((p) => p.id === r.id)!;
    return {
      id: pkg.id,
      kind: "package",
      title: pkg.name,
      subtitle: pkg.destination,
      score: r.score,
      href: pkg.slug ? `/packages/${pkg.slug}` : null,
      matchMode: mode,
      highlights: extractHighlights(`${pkg.name} ${pkg.destination ?? ""}`, query.text),
      record: pkg,
      facets: { trending: pkg.isTrending ?? false, status: pkg.status },
    };
  });

  return resultOf(query, hits, page, pageSize);
}

/**
 * Search destinations via Knowledge Engine.
 */
export async function searchDestinations(input: SearchQuery | string): Promise<SearchResult> {
  const query = parseSearchQuery(typeof input === "string" ? { text: input } : input);
  const mode = resolveMode(query);
  const { page, pageSize } = resolvePage(query);
  let destinations = await repoLoadDestinations(query.filters?.regionCode);
  if (query.filters?.destination) {
    destinations = destinations.filter((d) =>
      d.name.toLowerCase().includes(query.filters!.destination!.toLowerCase())
    );
  }

  const matched = destinations.filter((d) =>
    textMatches(`${d.name} ${d.subtitle ?? ""} ${d.country ?? ""}`, query.text, mode)
  );

  const ranked = rankCandidates(
    matched.map((d) => ({
      id: d.id,
      kind: "destination" as const,
      title: d.name,
      text: `${d.name} ${d.subtitle ?? ""}`,
      popularity: d.isTrending ? 80 : 40,
      featured: d.isTrending ?? false,
      businessWeight: d.showOnWebsite ? 0.7 : 0.3,
      quality: 0.6,
    }))
  );

  const hits: DestinationSearchHit[] = ranked.map((r) => {
    const d = matched.find((x) => x.id === r.id)!;
    return {
      id: d.id,
      kind: "destination",
      title: d.name,
      subtitle: d.subtitle,
      score: r.score,
      href: `/destinations/${d.slug}`,
      matchMode: mode,
      highlights: extractHighlights(`${d.name} ${d.subtitle ?? ""}`, query.text),
      record: d,
    };
  });

  return resultOf(query, hits, page, pageSize);
}

/**
 * Search knowledge domains (hotels, blogs, faqs) via Knowledge Engine.
 */
export async function searchKnowledge(input: SearchQuery | string): Promise<SearchResult> {
  const query = parseSearchQuery(typeof input === "string" ? { text: input } : input);
  const mode = resolveMode(query);
  const { page, pageSize } = resolvePage(query);
  const bundle = await repoLoadKnowledgeBundle(query.filters?.regionCode);

  type Kn = {
    id: string;
    domain: KnowledgeDomain;
    title: string;
    subtitle: string | null;
    text: string;
  };

  const candidates: Kn[] = [
    ...bundle.hotels.map((h) => ({
      id: h.id,
      domain: "hotels" as const,
      title: h.name,
      subtitle: h.category,
      text: `${h.name} ${h.category ?? ""} ${h.destinationName ?? ""}`,
    })),
    ...bundle.blogs.map((b) => ({
      id: b.id,
      domain: "blogs" as const,
      title: b.title,
      subtitle: b.excerpt,
      text: `${b.title} ${b.excerpt ?? ""}`,
    })),
    ...bundle.faqs.map((f) => ({
      id: f.id,
      domain: "faq" as const,
      title: f.question,
      subtitle: f.category,
      text: `${f.question} ${f.answer}`,
    })),
  ].filter((c) => textMatches(c.text, query.text, mode));

  const ranked = rankCandidates(
    candidates.map((c) => ({
      id: `${c.domain}:${c.id}`,
      kind: "knowledge" as const,
      title: c.title,
      text: c.text,
      popularity: 30,
      businessWeight: 0.5,
      quality: 0.5,
    }))
  );

  const hits: KnowledgeSearchHit[] = ranked.map((r) => {
    const c = candidates.find((x) => `${x.domain}:${x.id}` === r.id)!;
    return {
      id: r.id,
      kind: "knowledge",
      title: c.title,
      subtitle: c.subtitle,
      score: r.score,
      href: null,
      matchMode: mode,
      highlights: extractHighlights(c.text, query.text),
      domain: c.domain,
      recordId: c.id,
    };
  });

  return resultOf(query, hits, page, pageSize);
}

/**
 * Search customers via Customer Relationship Platform.
 */
export async function searchCustomers(input: SearchQuery | string): Promise<SearchResult> {
  const query = parseSearchQuery(typeof input === "string" ? { text: input } : input);
  const mode = resolveMode(query);
  const { page, pageSize } = resolvePage(query);
  const customers = await repoLoadCustomers();
  const matched = customers.filter((c) =>
    textMatches(`${c.name} ${c.email ?? ""} ${c.phone ?? ""}`, query.text, mode)
  );

  const ranked = rankCandidates(
    matched.map((c) => ({
      id: c.id,
      kind: "customer" as const,
      title: c.name,
      text: `${c.name} ${c.email ?? ""}`,
      updatedAt: c.updatedAt,
      businessWeight: 0.6,
      popularity: c.quotationIds.length * 10,
    }))
  );

  const hits: CustomerSearchHit[] = ranked.map((r) => {
    const c = matched.find((x) => x.id === r.id)!;
    return {
      id: c.id,
      kind: "customer",
      title: c.name,
      subtitle: c.email,
      score: r.score,
      href: `/customers/${c.id}`,
      matchMode: mode,
      highlights: extractHighlights(`${c.name} ${c.email ?? ""}`, query.text),
      record: c,
    };
  });

  return resultOf(query, hits, page, pageSize);
}

/**
 * Search leads via Customer Relationship Platform.
 */
export async function searchLeads(input: SearchQuery | string): Promise<SearchResult> {
  const query = parseSearchQuery(typeof input === "string" ? { text: input } : input);
  const mode = resolveMode(query);
  const { page, pageSize } = resolvePage(query);
  const leads = await repoLoadLeads();
  const matched = leads.filter((l) =>
    textMatches(
      `${l.name} ${l.email ?? ""} ${l.phone ?? ""} ${l.destination ?? ""}`,
      query.text,
      mode
    )
  );

  const ranked = rankCandidates(
    matched.map((l) => ({
      id: l.id,
      kind: "lead" as const,
      title: l.name,
      text: `${l.name} ${l.destination ?? ""}`,
      updatedAt: l.createdAt,
      businessWeight: l.qualification === "qualified" ? 0.9 : 0.5,
      popularity: 20,
    }))
  );

  const hits: LeadSearchHit[] = ranked.map((r) => {
    const l = matched.find((x) => x.id === r.id)!;
    return {
      id: l.id,
      kind: "lead",
      title: l.name,
      subtitle: l.destination,
      score: r.score,
      href: null,
      matchMode: mode,
      highlights: extractHighlights(`${l.name} ${l.destination ?? ""}`, query.text),
      record: l,
    };
  });

  return resultOf(query, hits, page, pageSize);
}

/**
 * Search quotations via Quotation Engine.
 */
export async function searchQuotations(input: SearchQuery | string): Promise<SearchResult> {
  const query = parseSearchQuery(typeof input === "string" ? { text: input } : input);
  const mode = resolveMode(query);
  const { page, pageSize } = resolvePage(query);
  const quotations = await repoLoadQuotations();
  const matched = quotations.filter((q) =>
    textMatches(
      `${q.title} ${q.quoteCode} ${q.client.name} ${q.client.email ?? ""}`,
      query.text,
      mode
    )
  );

  const ranked = rankCandidates(
    matched.map((q) => ({
      id: q.id,
      kind: "quotation" as const,
      title: q.title,
      text: `${q.title} ${q.quoteCode}`,
      updatedAt: q.updatedAt,
      popularity: Math.min(100, q.grandTotal / 1000),
      businessWeight: q.status === "accepted" ? 1 : 0.5,
      featured: q.status === "sent" || q.status === "viewed",
    }))
  );

  const hits: QuotationSearchHit[] = ranked.map((r) => {
    const q = matched.find((x) => x.id === r.id)!;
    return {
      id: q.id,
      kind: "quotation",
      title: q.title,
      subtitle: q.quoteCode,
      score: r.score,
      href: `/itinerary-builder/${q.id}`,
      matchMode: mode,
      highlights: extractHighlights(`${q.title} ${q.quoteCode}`, query.text),
      record: q,
    };
  });

  return resultOf(query, hits, page, pageSize);
}

/**
 * Aggregate global search across modules (deduplicated by kind:id).
 */
export async function searchGlobal(input: SearchQuery | string): Promise<SearchResult> {
  const query = parseSearchQuery(typeof input === "string" ? { text: input } : input);
  const kinds = query.kinds?.length ? query.kinds : ALL_SEARCH_KINDS;
  const { page, pageSize } = resolvePage(query);

  const parts = await Promise.all(
    kinds.map(async (kind) => {
      switch (kind) {
        case "package":
          return (await searchPackages(query)).hits;
        case "destination":
          return (await searchDestinations(query)).hits;
        case "knowledge":
          return (await searchKnowledge(query)).hits;
        case "customer":
          return (await searchCustomers(query)).hits;
        case "lead":
          return (await searchLeads(query)).hits;
        case "quotation":
          return (await searchQuotations(query)).hits;
        default:
          return [] as SearchHit[];
      }
    })
  );

  const merged = parts.flat();
  const seen = new Set<string>();
  const deduped: SearchHit[] = [];
  for (const hit of merged) {
    const key = `${hit.kind}:${hit.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(hit);
  }

  deduped.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  return resultOf(query, deduped, page, pageSize);
}

/**
 * Admin alias of global search (same engine, explicit surface name).
 */
export async function searchAdmin(input: SearchQuery | string): Promise<SearchResult> {
  return searchGlobal(input);
}

/**
 * AI context retrieval — returns global hits shaped for Intelligence prompt assembly.
 * Does not call providers; lexical only (semanticReady flag remains false).
 */
export async function searchForAiContext(input: SearchQuery | string): Promise<SearchResult> {
  const query = parseSearchQuery(typeof input === "string" ? { text: input } : input);
  const result = await searchGlobal({
    ...query,
    kinds: query.kinds ?? ["package", "destination", "knowledge"],
    limit: query.limit ?? 10,
  });
  return result;
}

/**
 * Autocomplete / suggestions: trending, popular packages & destinations, related.
 */
export async function getSuggestions(input: SearchQuery | string = { text: "" }): Promise<SuggestionsResult> {
  const query = parseSearchQuery(typeof input === "string" ? { text: input } : input);
  const text = query.text.trim().toLowerCase();
  const [packages, destinations] = await Promise.all([
    repoLoadPackages(query.filters?.regionCode),
    repoLoadDestinations(query.filters?.regionCode),
  ]);

  const items: SuggestionItem[] = [];

  for (const seed of TRENDING_SEARCH_SEEDS) {
    if (!text || seed.includes(text)) {
      items.push({
        id: `trending:${seed}`,
        kind: "trending",
        label: seed,
        value: seed,
        score: 0.5,
        href: null,
      });
    }
  }

  for (const pkg of packages.filter((p) => p.isTrending || p.showOnWebsite).slice(0, 8)) {
    if (!text || pkg.name.toLowerCase().includes(text)) {
      items.push({
        id: `package:${pkg.id}`,
        kind: "package",
        label: pkg.name,
        value: pkg.name,
        score: pkg.isTrending ? 0.9 : 0.7,
        href: pkg.slug ? `/packages/${pkg.slug}` : null,
      });
    }
  }

  for (const d of destinations.filter((x) => x.showOnWebsite).slice(0, 8)) {
    if (!text || d.name.toLowerCase().includes(text)) {
      items.push({
        id: `destination:${d.id}`,
        kind: "destination",
        label: d.name,
        value: d.name,
        score: d.isTrending ? 0.85 : 0.65,
        href: `/destinations/${d.slug}`,
      });
    }
  }

  // Related / frequently booked placeholders derived from trending packages (deterministic)
  for (const pkg of packages.filter((p) => p.isTrending).slice(0, 3)) {
    items.push({
      id: `related:${pkg.id}`,
      kind: "related",
      label: `Related: ${pkg.name}`,
      value: pkg.name,
      score: 0.55,
      href: pkg.slug ? `/packages/${pkg.slug}` : null,
    });
    items.push({
      id: `frequent:${pkg.id}`,
      kind: "frequently_booked",
      label: `Frequently booked: ${pkg.name}`,
      value: pkg.name,
      score: 0.6,
      href: pkg.slug ? `/packages/${pkg.slug}` : null,
    });
  }

  items.sort((a, b) => b.score - a.score);
  const dedup = new Map<string, SuggestionItem>();
  for (const item of items) {
    if (!dedup.has(item.id)) dedup.set(item.id, item);
  }

  return {
    query: query.text,
    items: [...dedup.values()].slice(0, query.limit ?? 15),
    retrievedAt: new Date().toISOString(),
  };
}

/** Autocomplete alias. */
export async function autocomplete(input: SearchQuery | string): Promise<SuggestionsResult> {
  return getSuggestions(input);
}

/**
 * Empty facet scaffold for faceted search UI consumers.
 */
export function emptySearchFacets(): SearchFacets {
  return emptyFacets();
}
