# Roadmap

Single Next.js app · Feature modules · Intelligence via Knowledge + Search · Renderer for all channels

---

## Phase 0 — Architecture foundation

- Scaffold route groups: `(website)`, `(admin)`, `(customer)`, `(team)`, `(auth)`
- Scaffold `modules/` skeletons (intelligence, chat, knowledge, search, renderer, design-system, …)
- Document module ↔ table ownership (Travel Days tables only)
- Keep mock/demo path until Knowledge is seeded

---

## Phase 1 — Modularize existing product

- Map admin CMS → `(admin)` + `modules/packages` / destinations workflows
- Map itinerary builder → `(team)` + `modules/quotation`
- Map proposals → `(customer)` + `modules/renderer/quotation`
- Map leads/customers/sync → `modules/crm`
- Introduce `modules/design-system` tokens (Royal Rajasthan) without rewriting all screens
- Stabilize real Supabase mode for existing features (reuse tables)

---

## Phase 2 — Website + Knowledge reads

- `(website)` layout branding via design-system
- Dynamic package & destination pages via **Knowledge Engine**
- `modules/search` (package, destination, suggestions)
- Public lead APIs aligned with existing `/api/public/*`
- Extend schema only where needed (`package_days`, `package_places`, places, …)

---

## Phase 3 — Knowledge Engine completeness

- Implement knowledge domains: destinations, packages, places, activities, foods, hotels, weather, culture, shopping, travel-tips, faq, blogs
- Seed Rajasthan grounded content
- All catalog reads for AI paths go through Knowledge only
- Wire `td_system_settings` keys for intelligence config

---

## Phase 4 — Intelligence Engine + Chat

- `modules/intelligence`: providers, retrieval orchestration, prompt-builder, formatter, planner, cache, memory, validator, logging
- `modules/chat`: widget, conversation, sessions, history, feedback
- `POST /api/chat` → chat → intelligence → search/knowledge → JSON → renderer
- Website floating widget with rich cards/timeline via `modules/renderer`
- Provider fallback → Search + Knowledge structured results

---

## Phase 5 — Itinerary, quote assist, multi-format render

- Planner-driven custom itinerary (facts from Knowledge only)
- Persist via extended quotation / client itinerary model (reuse, avoid dual systems)
- Share pages, `renderer/pdf`, WhatsApp CTA (`renderer/whatsapp`)
- Team AI assist inside quotation; Customer portal views
- Email rendering via `renderer/email`

---

## Phase 6 — Channel expansion + CRM AI

- WhatsApp channel adapter under `modules/chat` (same conversation + intelligence)
- CRM AI assists (lead summarize, next actions) via intelligence + crm
- Customer Portal AI / Team AI surfaces
- `modules/analytics`
- Notifications module

---

## Phase 7 — Platform expansion

- Mobile app channel (same chat contract)
- Voice AI channel
- Multi-state support (`states` / Knowledge expansion)
- Advanced analytics & cost controls for providers

---

## Dependency order (summary)

```
Design System → Knowledge → Search
                  ↓
             Intelligence
                  ↓
        Chat + Renderer + Itinerary/Quotation
                  ↓
         CRM / Portals / Future channels
```
