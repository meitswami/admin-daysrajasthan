# Architecture

TravelDays is a **single Next.js application** with feature-based modules.

Product surfaces (App Router groups) share one codebase:

| Route group | Audience |
|-------------|----------|
| `(website)` | Public visitors |
| `(admin)` | Operators / CMS / configuration |
| `(customer)` | Travelers (portal) |
| `(team)` | Sales / operations (quotation, pipeline) |
| `api/` | Shared HTTP boundary for all surfaces |

CRM, quotation, chat, knowledge, search, renderer, and intelligence are **modules**, not separate apps.

---

## Core principles

1. **Supabase is the source of truth** — never invent travel facts.
2. **Knowledge Engine** is the **only** layer that queries Supabase for domain content.
3. **Search** is an independent module used by Knowledge / surfaces — Intelligence never queries the DB directly.
4. **Intelligence Engine** orchestrates reasoning: retrieve (via Knowledge/Search) → prompt → provider → validate → structured JSON.
5. **Renderer** turns JSON into React UI (and channel payloads). Intelligence never returns Markdown UI.
6. **Chat** is a communication channel layer (web widget today; WhatsApp, voice, CRM, mobile later) — business logic stays in Intelligence / Knowledge / Quotation.
7. **Design System** owns Royal Rajasthan branding so every surface and chat cards stay consistent.

---

## High-level runtime flow

```
User (website | admin | customer | team | future channels)
  → Next.js App Router
  → Surface UI / Chat Widget
  → API Routes
  → modules/chat (session, conversation, channel adapter)
  → modules/intelligence (intent, planner, providers, formatter, validator)
       ├→ modules/search     (find candidates)
       └→ modules/knowledge  (load canonical facts from Supabase)
  → Structured JSON only
  → modules/renderer         (chat | timeline | package | quotation | pdf | email | whatsapp)
  → Beautiful React / channel output
```

```
                    ┌─────────────────┐
                    │  Design System  │  theme · tokens · cards · motion
                    └────────┬────────┘
                             │ used by
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
   ┌──────────┐       ┌────────────┐       ┌──────────┐
   │   Chat   │──────▶│Intelligence│──────▶│ Renderer │
   │ channels │       │   Engine   │ JSON  │  views   │
   └──────────┘       └─────┬──────┘       └──────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
       ┌────────────┐              ┌────────────┐
       │   Search   │              │  Knowledge │
       │  module    │─────────────▶│   Engine   │
       └────────────┘              └─────┬──────┘
                                         ▼
                                   ┌──────────┐
                                   │ Supabase │
                                   └──────────┘
```

**Hard rules**

- Intelligence **must not** call Supabase clients directly.
- Intelligence **must not** perform raw SQL / table queries.
- All factual retrieval goes: Intelligence → Knowledge (and/or Search → Knowledge).
- Intelligence output = **structured JSON only**.
- Renderer owns presentation for every channel.

---

## Intelligence Engine (`modules/intelligence`)

Powers: Website AI, CRM AI, WhatsApp AI, Customer Portal AI, Team AI, future Voice AI.

```
modules/intelligence/
  providers/        # HuggingFace, GitHub Models, OpenRouter, future local LLM
  retrieval/        # Orchestrates Knowledge + Search calls (no DB)
  prompt-builder/   # Builds prompts from retrieved context only
  formatter/        # Normalizes model output into product JSON schemas
  planner/          # Multi-step plans (itinerary, quote assist, CRM suggest)
  cache/            # Response / embedding cache coordination
  memory/           # Conversation & preference memory (not inventing facts)
  validator/        # Schema + fact-grounding checks
  logging/          # ai_logs, traces, cost/latency
```

Pipeline:

```
Intent → Entity extraction → Planner
  → Search (candidates)
  → Knowledge (canonical records)
  → Prompt builder
  → Provider
  → Formatter
  → Validator
  → JSON
  → Renderer
```

Fallback when providers fail: Search + Knowledge structured results (no hallucinated prose).

---

## Chat / Communication (`modules/chat`)

Channel-agnostic conversation layer. Swapping WhatsApp / Voice / Mobile must not rewrite Intelligence or Knowledge.

```
modules/chat/
  widget/           # Website floating chat UI shell
  conversation/     # Turn-taking, message orchestration
  sessions/         # chat_sessions lifecycle
  history/          # chat_messages read models
  feedback/         # thumbs / corrections / ratings
```

Future channel adapters (same module family, added later):

- WhatsApp transport
- Mobile app transport
- Voice transport
- CRM in-app assistant transport

Adapters call `conversation` + Intelligence; they do not embed travel facts.

---

## Knowledge Engine (`modules/knowledge`)

**Single source responsible for querying Supabase** for travel domain content.

```
modules/knowledge/
  destinations/
  packages/         # maps to existing itineraries (+ extensions)
  places/
  activities/
  foods/
  hotels/           # maps to website_hotels
  weather/
  culture/
  shopping/
  travel-tips/
  faq/
  blogs/
```

Knowledge owns:

- Supabase queries / RLS-aware reads
- Domain DTOs for Intelligence and Search
- Grounded content assemblies (context packets)

Intelligence and Renderer consume Knowledge DTOs — never raw table sprawl in UI.

---

## Search (`modules/search`)

Independent discovery module. Intelligence never “searches the database”; it asks Search and/or Knowledge.

```
modules/search/
  package-search/
  destination-search/
  knowledge-search/
  global-search/      # admin / team unified find
  suggestions/        # typeahead, suggested prompts
```

Search may call Knowledge helpers for hydration; it does not bypass Knowledge ownership of canonical reads.

---

## Response Renderer (`modules/renderer`)

```
modules/renderer/
  chat/             # rich message bubbles, cards
  timeline/         # day-by-day itinerary
  package/          # package summary cards
  quotation/        # quote / commercial views
  pdf/              # print & PDF composition
  email/            # email body layouts
  whatsapp/         # WhatsApp-safe message templates
```

Contract: **JSON in → React / channel payload out**.

---

## Design System (`modules/design-system`)

Royal Rajasthan branding for website chat and all branded surfaces.

```
modules/design-system/
  theme/
  tokens/           # cream, maroon, gold, typography, spacing
  icons/
  animations/
  cards/            # shared branded card primitives for chat/renderer
```

UI primitives used by `components/` and Renderer must pull tokens from here.

---

## Other domain modules

```
modules/
  itinerary/        # generate / persist / share itineraries
  packages/         # admin/CMS package workflows (uses Knowledge)
  destinations/     # admin workflows (uses Knowledge)
  crm/              # leads, customers, webhook sync
  analytics/
  auth/
  quotation/        # cost engine, revisions, share/accept
  customer/
  team/
  notifications/
  shared/           # errors, result types, cross-cutting helpers
```

Surface-oriented UI remains under `src/components/{website,admin,customer,team,chat,shared,ui}`.

---

## Folder structure (target)

```
src/
  app/
    (website)/
    (admin)/
    (customer)/
    (team)/
    (auth)/                 # login / MFA / password
    api/
    layout.tsx
    globals.css

  modules/
    intelligence/
      providers/
      retrieval/
      prompt-builder/
      formatter/
      planner/
      cache/
      memory/
      validator/
      logging/
    chat/
      widget/
      conversation/
      sessions/
      history/
      feedback/
    knowledge/
      destinations/
      packages/
      places/
      activities/
      foods/
      hotels/
      weather/
      culture/
      shopping/
      travel-tips/
      faq/
      blogs/
    search/
      package-search/
      destination-search/
      knowledge-search/
      global-search/
      suggestions/
    renderer/
      chat/
      timeline/
      package/
      quotation/
      pdf/
      email/
      whatsapp/
    design-system/
      theme/
      tokens/
      icons/
      animations/
      cards/
    itinerary/
    packages/
    destinations/
    crm/
    analytics/
    auth/
    quotation/
    customer/
    team/
    notifications/
    shared/

  components/
    ui/
    website/
    admin/
    customer/
    team/
    chat/
    shared/

  hooks/
  lib/
    supabase/               # clients only — domain queries live in knowledge/
    utils/
    constants/
  types/
```

---

## Dependency rules

| Module | May depend on | Must not |
|--------|---------------|----------|
| `intelligence` | `knowledge`, `search`, `shared` | Supabase directly, `renderer` UI, channel widgets |
| `knowledge` | `lib/supabase`, `shared` | `intelligence`, channel-specific UI |
| `search` | `knowledge`, `shared` | Providers / prompt builders |
| `chat` | `intelligence`, `renderer`, `design-system`, `shared` | Direct Supabase domain queries |
| `renderer` | `design-system`, `shared` | Providers, Supabase |
| `quotation` / `crm` / portals | `knowledge`, `shared`, optionally `intelligence` | Bypassing Knowledge for catalog facts |

---

## Supabase (same project)

- Reuse existing Travel Days tables (`itineraries`, `website_*`, `blogs`, `client_itineraries`, leads, etc.).
- Add knowledge/chat/AI tables only where no fit exists (places, activities, foods, tips, chat_*, cache/logs).
- Knowledge Engine is the application boundary for Travel Days content queries.

---

## Surfaces ↔ modules (examples)

| Surface | Typical modules |
|---------|-----------------|
| Website chat | `chat` + `intelligence` + `knowledge` + `search` + `renderer` + `design-system` |
| Package pages | `knowledge/packages` + `renderer/package` |
| Team quotation | `quotation` + `renderer/quotation` + optional `intelligence` assist |
| Customer proposal | `quotation` + `renderer` + `customer` |
| Admin CMS | `packages` / `destinations` / `knowledge` writers + `auth` |
| Future WhatsApp | new chat transport → same `conversation` + `intelligence` |

---

## Non-goals

- Multiple Next.js apps / monorepo `apps/web` + `apps/admin`
- New Supabase project (unless leadership later revisits)
- Intelligence calling the database
- AI returning Markdown as the product UI contract
