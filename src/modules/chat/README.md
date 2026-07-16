# Chat Platform

Website platform feature for configuring, embedding, and deploying the Travel Days chat widget — now with live AI turns.

## Runtime modes (real)

| Mode | Behaviour |
|------|-----------|
| **Offline** | Leave-a-message; confirmation reply; no Intelligence |
| **AI** | `POST /api/chat` → Gateway → Intelligence → (Mock) Provider → Renderer → DTO reply |
| **Disabled** | Widget closed |

## Flow (AI mode)

```
Widget
  → POST /api/chat
  → API Gateway
  → Travel Intelligence (planner → Search → Knowledge via Search)
  → Mock Provider (interface) or Search fallback
  → Renderer (DTO only)
  → Chat UI
```

## Endpoint

`POST /api/chat` — anonymous public (`public.chat`)

Body: `{ key, message, sessionId?, name?, email? }`

Response data: `{ mode, sessionId, replyText, presentation, analytics, intelligence }`

Never HTML / Markdown as product contract — Renderer DTOs only.

## Knowledge Scope

Filters retrieval presentation by packages / destinations / FAQ / blogs and optional `regionCodes` (e.g. Rajasthan-only).

## Provider

Mock provider registered as Intelligence `local` via `registerProvider` — no HuggingFace hardcoding.

If provider unavailable → Search-grounded fallback → never fail.

## Persist

Sessions · Messages · Feedback · Analytics (response time, fallback, search hits, provider)

## Admin

`Admin → AI & Chat → Chat Platform` (`/ai-chat`)
