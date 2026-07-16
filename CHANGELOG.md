# Changelog

All notable implementation changes for TravelDays (single Next.js app).

## [Unreleased]

### Phase 0

#### Cleanup — Remove unrelated project references (2026-07-15)

**Why:** Another product’s database/docs briefly leaked into this repo. Travel Days must only document Travel Days.

**Changed / removed:**
- Deleted isolation-plan doc and guard file for the foreign tables
- Stripped foreign-project mentions from `ARCHITECTURE.md`, `DATABASE.md`, `ROADMAP.md`, `README.md`, `MODULE_TABLE_OWNERSHIP.md`, `.env.local.example`, tracking docs

#### Task 01 — Project structure (2026-07-15)

**Why:** Establish approved route groups and feature-module skeleton without moving working product routes.

**Changed files:**
- `src/modules/shared/module-contract.ts`, `errors.ts`, `index.ts`
- `src/modules/index.ts`
- `src/modules/{intelligence,chat,knowledge,search,renderer,design-system}/**`
- `src/modules/{itinerary,packages,destinations,crm,analytics,auth,quotation,customer,team,notifications}/index.ts`
- `src/app/(website|admin|customer|team|auth)/layout.tsx`
- `CURRENT_STATE.md`, `TravelDays_AI_Development_Kit/TASKS.md`

**Verification:** `npm run build` exit 0

#### Task 03 — Supabase inventory (2026-07-15)

**Why:** Document Travel Days table ownership for Knowledge and domain modules.

**Changed files:**
- `TravelDays_AI_Development_Kit/MODULE_TABLE_OWNERSHIP.md`
- `src/modules/shared/tables.ts` — `TRAVEL_DAYS_TABLES`
- `src/modules/shared/index.ts` — exports

**Verification:** included in later Phase 0 build

#### Task 04 — Knowledge DTO contracts (2026-07-15)

**Why:** Freeze Knowledge fact shapes so Search/Intelligence can depend on stable types without DB queries yet.

**Changed files:**
- `src/modules/knowledge/types.ts`
- `src/modules/knowledge/index.ts`
- `src/modules/knowledge/*/index.ts` — domain type re-exports

#### Task 05 — Search contracts (2026-07-15)

**Why:** Define discovery hit/suggestion contracts; Search hydrates via Knowledge only.

**Changed files:**
- `src/modules/search/types.ts`
- `src/modules/search/index.ts`
- `src/modules/search/*/index.ts`

**Verification:** `npm run build` exit 0 — Phase 0 complete

#### Task 02 — Design system + ADRs + module READMEs (2026-07-15)

**Why:** Establish Royal Rajasthan tokens as a reusable module; document ADRs and module READMEs required by Phase 1 conventions.

**Changed files:**
- `src/modules/design-system/{types,schemas,constants,validators,service,index,README}.ts(md)`
- `src/modules/design-system/{theme,tokens,icons,animations,cards}/index.ts`
- `src/modules/*/README.md` (all modules)
- `docs/adr/ADR-001-single-app.md` … `ADR-005-renderer.md`, `docs/adr/README.md`
- `docs/MODULE_CONVENTIONS.md`
- `CURRENT_STATE.md`, `TravelDays_AI_Development_Kit/TASKS.md`

**Verification:** `npm run build` exit 0 — **stopped for approval**

#### Task 06 — Knowledge Engine foundation (2026-07-15)

**Why:** Make Knowledge the reusable tourism catalog layer; Package CMS reads only through Knowledge DTOs.

**Changed files:**
- `src/modules/knowledge/{types,schemas,constants,validators,cache,mappers,repository,service,index}.ts`
- `src/modules/knowledge/{packages,destinations,hotels,blogs,faq}/index.ts`
- `src/modules/knowledge/README.md` (architecture diagram)
- `src/modules/packages/{types,schemas,constants,validators,service,index,README}.*`
- `src/app/(dashboard)/itineraries/page.tsx` — `listCmsPackages()`
- `src/app/(admin)/packages/page.tsx` — redirect stub
- `CURRENT_STATE.md`, `TravelDays_AI_Development_Kit/TASKS.md`

**Verification:** `npm run build` exit 0 — **stopped for approval**

#### Task 07 — Quotation Workflow Engine (2026-07-15)

**Why:** Provide one reusable quotation engine for all surfaces; keep pricing deterministic and event-driven.

**Changed files:**
- `src/modules/quotation/{types,schemas,constants,validators,events,mappers,repository,service,index}.ts`
- `src/modules/quotation/pricing/{service,index}.ts`
- `src/modules/quotation/README.md` (workflow diagrams)
- `CURRENT_STATE.md`, `TravelDays_AI_Development_Kit/TASKS.md`

**Verification:** `npm run build` exit 0 — **stopped for approval**

#### Task 08 — Customer Relationship Platform (2026-07-15)

**Why:** Establish a reusable customer lifecycle platform for Website, portals, AI, and WhatsApp — not a traditional CRM screen.

**Changed files:**
- `src/modules/customer-relations/**` (types, schemas, constants, validators, cache, mappers, store, repository, service, events, submodules, README, TABLE_OWNERSHIP)
- `src/modules/shared/module-contract.ts` — registered `customer-relations`
- `src/modules/index.ts` — export manifest
- `src/modules/crm/README.md` — legacy pointer to CRP
- `CURRENT_STATE.md`, `TravelDays_AI_Development_Kit/TASKS.md`

**Verification:** `npm run build` exit 0 — **stopped for approval**

#### Task 09 — Universal Search Engine (2026-07-15)

**Why:** Provide one central search engine for Website, Admin, CRP, Quotation, and AI context — without bypassing domain modules.

**Changed files:**
- `src/modules/search/{types,schemas,constants,validators,repository,service,index}.ts`
- `src/modules/search/{cache,ranking,filters}/index.ts`
- `src/modules/search/{package-search,destination-search,knowledge-search,customer-search,quotation-search,lead-search,global-search,suggestions}/index.ts`
- `src/modules/search/README.md`
- `src/modules/shared/module-contract.ts` — search may depend on CRP + Quotation
- `CURRENT_STATE.md`, `TravelDays_AI_Development_Kit/TASKS.md`

**Not changed:** Design System, Knowledge, Quotation, CRP module internals (frozen).

**Verification:** `npm run build` exit 0 — **stopped for approval**

#### Task 10 — Universal API Gateway (2026-07-15)

**Why:** Make one reusable gateway the only entry point for Website, Admin, portals, AI, and future Mobile / WhatsApp / public APIs.

**Changed files:**
- `src/modules/api-gateway/{types,constants,schemas,validators,service,middleware,response,auth,permissions,feature-flags,logging,metrics,rate-limit,versioning,index,README}.*`
- `src/modules/shared/module-contract.ts` — registered `api-gateway`
- `src/modules/index.ts` — export manifest
- `src/app/api/public/{contact,inquiry,whatsapp-lead,itinerary-download,site-settings}/route.ts` — thin `runGateway` routes
- `src/lib/api/public-handler.ts` — `persistPublicRecord` for gateway handlers
- `CURRENT_STATE.md`, `TravelDays_AI_Development_Kit/TASKS.md`, kit `README.md`

**Not changed:** Design System, Knowledge, Quotation, CRP, Search (frozen).

**Verification:** `npm run build` exit 0 — **stopped for approval**

#### Task 11 — Travel Intelligence Engine (2026-07-15)

**Why:** Establish one decision brain for all AI surfaces; facts only via Search → Knowledge; DTOs only.

**Changed files:**
- `src/modules/intelligence/{types,constants,schemas,validators,repository,service,index,README}.*`
- `src/modules/intelligence/{planner,orchestrator,context-builder,prompt-builder,provider,formatter,validator,parser,memory,cache,logging,telemetry,safety}/`
- Removed scaffold `providers/` + `retrieval/` (replaced by `provider/` + `orchestrator/`)
- `src/modules/shared/module-contract.ts` — intelligence may depend on `search` + `shared` only (not Knowledge-direct)
- `CURRENT_STATE.md`, `TravelDays_AI_Development_Kit/{TASKS,README,AI_ENGINE}.md`

**Not changed:** Design System, Knowledge, Quotation, CRP, Search, API Gateway (frozen).

**Verification:** `npm run build` exit 0 — **stopped for approval**

#### Task 12 — Universal Renderer Engine (2026-07-15)

**Why:** Own all presentation so Intelligence stays DTO-only; one renderer for Website, Chat, portals, Email, PDF, WhatsApp.

**Changed files:**
- `src/modules/renderer/{types,constants,schemas,validators,theme,service,react-adapter,index,README}.*`
- `src/modules/renderer/{blocks,chat,timeline,package,destination,quotation,itinerary,cards,tables,gallery,maps,pdf,email,whatsapp,seo,metadata}/`
- `src/modules/shared/module-contract.ts` — renderer description refreshed
- `CURRENT_STATE.md`, `TravelDays_AI_Development_Kit/{TASKS,README}.md`

**Not changed:** Design System, Knowledge, Quotation, CRP, Search, API Gateway, Intelligence (frozen).

**Verification:** `npm run build` exit 0 — **stopped for approval**

#### Task 13A — Chat Platform Management (2026-07-15)

**Why:** Website platform should configure/embed/deploy the chat widget before AI conversations are enabled.

**Changed files:**
- `src/modules/chat/{types,constants,schemas,validators,repository,server-store,service,index,README}.*`
- `src/modules/chat/{keys,embed}/`
- `src/components/modules/chat-platform/{chat-platform-shell,offline-widget}.tsx`
- `src/app/(dashboard)/ai-chat/**`
- `src/app/embed/chat/page.tsx`
- `src/app/api/chat/{platform/sync,widget/config,widget/script,widget/message}/route.ts`
- Navigation / RBAC (`chat.manage`) — sidebar **AI & Chat**
- `CURRENT_STATE.md`, `TravelDays_AI_Development_Kit/TASKS.md`, kit `README.md`

**Not changed:** Design System, Knowledge, Quotation, CRP, Search, API Gateway, Intelligence, Renderer (frozen).

**Verification:** `npm run build` exit 0 — **stopped for approval**

#### Task 13B — Travel Intelligence Integration (2026-07-15)

**Why:** Connect existing Widget + Gateway + Intelligence + Search/Knowledge + Renderer into a working Travel Assistant.

**Changed files:**
- `src/modules/chat/{types,schemas,constants,repository,server-store,service,mock-provider,README}.*`
- `src/modules/chat/conversation/orchestrate.ts` — turn pipeline
- `src/app/api/chat/route.ts` — thin Gateway route
- Widget shell AI/Offline/Disabled runtime + `/api/chat` client
- Admin Widget Settings modes: Offline / AI / Disabled
- Docs: `CURRENT_STATE.md`, `CHANGELOG.md`, `TASKS.md`, kit `README.md`

**Not redesigned:** Design System, Knowledge, Quotation, CRP, Search, API Gateway, Intelligence, Renderer internals (public APIs only: `runGateway`, `runIntelligence`, `registerProvider`, `renderIntelligenceDto`).

**Verification:** `npm run build` exit 0 — **stopped for approval**
