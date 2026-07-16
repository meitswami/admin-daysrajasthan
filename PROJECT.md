# Travel Days Rajasthan — Website Admin Panel

> **New build** · AI-ready · Modern stack · Demo mode with linked mock data  
> Database connection deferred to final phase.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS 4 |
| Auth & DB | Supabase (prepared, connect at end) |
| Validation | Zod |
| Icons | Lucide React |
| CRM Sync | Webhook API → Travel CRM |

## Quick Start

```bash
cd travel-days-admin
npm install
npm run dev
```

Open http://localhost:3000 → `/dashboard` (demo mode, no env required)

---

## 9 Modules — Status

| # | Module | Route | Status |
|---|--------|-------|--------|
| 1 | Admin Authentication | `/login`, `/login/forgot-password`, `/settings` | ✅ Demo login, password UI, sign out |
| 2 | Dashboard | `/dashboard` | ✅ Stats, activity, AI insights, bulk CRM sync |
| 3 | Itinerary Management | `/itineraries` | ✅ Website packages — PDF CRUD & download leads |
| 3b | **Itinerary Builder (V2)** | `/itinerary-builder` | ✅ Versions, day editor, cost engine, share links, PDF, digital acceptance |
| 4 | Contact Us | `/contacts` | ✅ List, resolve, linked profiles |
| 5 | Inquiry Forms | `/inquiries` | ✅ Status workflow, lead scoring, AI summarize |
| 6 | Blog CMS | `/blogs` | ✅ Editor (Content/SEO/Preview), categories, tags |
| 7 | WhatsApp Leads | `/whatsapp-leads` | ✅ List, manual CRM sync |
| 8 | CRM Integration | `/settings`, `/api/crm/sync` | ✅ Webhook test, sync logs |
| 9 | Reports | `/reports` | ✅ CSV export all modules |

**Also:** Global search `/search`, public APIs `/api/public/*`

Legend: ✅ Done in demo · 🔌 Needs DB connection at end

---

## Public Website APIs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/public/contact` | Contact form |
| POST | `/api/public/inquiry` | Package inquiry |
| POST | `/api/public/itinerary-download` | PDF download lead |
| POST | `/api/public/whatsapp-lead` | WhatsApp click |
| POST | `/api/itinerary-builder/share` | Create revision-pinned client proposal link |
| GET | `/api/itinerary-builder/share/[token]` | Fetch proposal for client portal |
| POST | `/api/itinerary-builder/share/[token]/accept` | Digital acceptance |

**Client proposal (public):** `/proposal/[token]` — demo: `/proposal/qrt807-demo-share`

---

## Final Step (when ready)

1. Create Supabase project
2. Run `supabase/migrations/001` → `006`
3. Add `.env.local` keys
4. Set `DATA_SOURCE = "supabase"` in `lib/data/index.ts`

---

## Related Audit Docs

Operations portal reference: `../project-audit/documentation/sitemap.md`  
Itinerary Builder FRS: `../project-audit/documentation/To Build Itinerary Builder.md`
