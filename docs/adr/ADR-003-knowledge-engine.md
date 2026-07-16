# ADR-003: Knowledge Engine Owns Domain Reads

## Status

Accepted

## Context

AI features must not invent travel facts. Multiple modules (chat, search, quotation, website) need destinations, packages, hotels, and related content. Direct Supabase access from Intelligence or UI would duplicate queries and invite hallucination.

## Decision

Introduce **`modules/knowledge`** as the **only** layer that queries Supabase for travel-domain content.

Domains include: destinations, packages, places, activities, foods, hotels, weather, culture, shopping, travel-tips, faq, blogs.

Intelligence and Search consume Knowledge DTOs — they never issue catalog SQL themselves.

## Consequences

- Stable DTOs (`types.ts`) and repositories behind `service.ts`
- Search may call Knowledge to hydrate hits, not bypass it
- New knowledge tables are added only when reuse is impossible
- Unit tests can mock repositories without touching Supabase
