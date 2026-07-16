# Knowledge Engine

## Purpose

**Only** module allowed to query tourism knowledge from Supabase / mock storage. Returns normalized DTOs for Search, Intelligence, CMS, and portals.

## Architecture

```
Supabase (Travel Days tables) / mock
            ↓
      Repository  (raw access + map to DTO)
            ↓
   Knowledge Service  (filters, cache hook, business rules)
            ↓
           DTO
            ↓
   Search / Intelligence / Packages CMS / Website
```

## Responsibilities

- Read packages (`itineraries`), destinations (`website_destinations`), hotels (`website_hotels`), blogs (`blogs`), FAQs (`web_pages`)
- Stable empty lists for places / activities / foods / weather / culture / shopping / travel-tips until tables exist
- Region-agnostic filters (`regionCode`) for future multi-state SaaS
- Cache adapter (`withKnowledgeCache`) — swap implementation later without API changes

## Dependencies

- `shared`
- `lib/supabase` clients + existing query helpers (repository only)
- `lib/data` mock sources while `DATA_SOURCE = "mock"`

**Must not:** invent facts; expose raw DB rows; hardcode a single state in public APIs.

## Exported services

| Function | Description |
|----------|-------------|
| `listPackages` / `getPackage` / `getPackageBySlug` | Packages |
| `listDestinations` / `getDestination` / `getDestinationBySlug` | Destinations |
| `listHotels` / `getHotel` | Hotels |
| `listBlogs` / `getBlogBySlug` | Blogs |
| `listFaqs` | FAQs |
| `listPlaces` … `listTravelTips` | Reserved empty domains |
| `buildContextPacket` | Grounded packet for Intelligence |
| `setKnowledgeCache` | Inject cache backend later |

## Module files

`types` · `schemas` · `constants` · `validators` · `cache` · `mappers` · `repository` · `service` · `index`

## Future roadmap

- Write APIs (admin CMS mutations)
- Seed structured places / tips tables
- Redis cache adapter
- Multi-region catalog completeness
