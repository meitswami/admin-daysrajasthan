# Universal Search Engine

Central Search Engine for every TravelDays surface and module. **Never queries Supabase directly.**

## Architecture

```
Website / Admin / Team / Customer / AI
              ↓
        Search Engine
              ↓
   ┌──────────┼──────────┐
   ↓          ↓          ↓
Knowledge   CRP      Quotation
 Engine
   ↓
Supabase (via those modules only)
   ↓
  DTO hits
   ↓
Renderer / Intelligence
```

## How modules use Search

| Consumer | Call |
|----------|------|
| Website | `searchPackages`, `searchDestinations`, `getSuggestions` |
| Admin | `searchAdmin` / `searchGlobal` |
| CRP UI (future) | `searchCustomers`, `searchLeads` |
| Quotation UI (future) | `searchQuotations` |
| Intelligence | `searchForAiContext` (lexical; semantic-ready flag) |
| Chat prompts | `getSuggestions` / `autocomplete` |

## Responsibilities

- Package / Destination / Knowledge / Customer / Lead / Quotation / Global / Admin search  
- Autocomplete & suggestions (trending, popular, related, frequently booked)  
- Ranking · filtering · sorting · aggregation · deduplication · normalization  
- Pagination / cursor fields · facets scaffold  
- Cache abstraction (no Redis yet)  
- Future: PostgreSQL FTS, pgvector, hybrid — without breaking public APIs (`engineHints`)

## Layering

```
service.ts     ranking, filters, merge, facets
repository.ts  load candidates via Knowledge / CRP / Quotation only
ranking/       scoring weights
filters/       match modes + travel filters
cache/         future Redis-compatible
```

## Match modes

Exact · Prefix · Contains · Keyword · Tag · Category · Region · `semantic_future`

## Ranking priorities

Popularity · Recency · Business weight · Featured · Season · Package quality · Future AI ranking (weight reserved at 0)

## Filters

Budget · Duration · Destination · Region · Hotel category · Activity · Travel style (family/couple/group/luxury/adventure/pilgrimage)

## Frozen modules

Knowledge, Quotation, CRP, and Design System are **not modified** by this task — only consumed.

## Future roadmap

- Embeddings / hybrid retrieval behind same `search*` APIs  
- Facet counts from full candidate sets  
- Cursor pagination token codec  
- Infinite scroll helpers for website
