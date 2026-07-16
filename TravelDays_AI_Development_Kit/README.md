# TravelDays AI Development Kit

Permanent context for Cursor / Claude Code.

**Product shape:** one Next.js application · feature-based modules · shared Supabase project.

## Development order

1. Read `AGENTS.md`
2. Read `MASTER_PROMPT.md`
3. Read `ARCHITECTURE.md` ← **single source of structure**
4. Read `DATABASE.md` and `MODULE_TABLE_OWNERSHIP.md`
5. Read `UI_UX_GUIDELINES.md`
6. Read `API_SPEC.md`
7. Read `AI_ENGINE.md` (Intelligence Engine)
8. Read `ROADMAP.md`
9. Execute `TASKS.md` sequentially

## Critical module map

| Module | Role |
|--------|------|
| `api-gateway` | **Only** external API entry (validate · auth · rate limit · envelope) |
| `intelligence` | Decision brain — Search only → structured JSON (never HTML) |
| `knowledge` | **Only** Supabase domain query layer |
| `search` | Discovery; used by intelligence, never DB-direct from intelligence |
| `chat` | Chat Platform — widget + `/api/chat` → Intelligence → Renderer |
| `renderer` | DTOs → presentation models (React / PDF / email / WhatsApp / JSON) |
| `design-system` | Royal Rajasthan theme, tokens, cards, motion |

Do not create `apps/admin` + `apps/web`. Do not invent a second Supabase project unless leadership revisits.
