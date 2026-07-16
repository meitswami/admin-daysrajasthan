# APIs

Shared under `src/app/api`. Handlers stay thin; call modules.

## Intelligence / chat

| Method | Path | Module path |
|--------|------|-------------|
| POST | `/api/chat` | chat → intelligence → search/knowledge → JSON |
| POST | `/api/itinerary/generate` | intelligence planner + knowledge + itinerary |
| GET | `/api/itinerary/{id}` | itinerary / knowledge |
| POST | `/api/lead` | crm (align with existing public lead routes) |
| GET | `/api/search` | search |
| GET | `/api/packages` | knowledge/packages |
| GET | `/api/destination/{slug}` | knowledge/destinations |

## Existing public (keep; later align naming)

| Method | Path |
|--------|------|
| POST | `/api/public/contact` |
| POST | `/api/public/inquiry` |
| POST | `/api/public/itinerary-download` |
| POST | `/api/public/whatsapp-lead` |
| GET | `/api/public/site-settings` |

## Quotation / proposals

| Method | Path |
|--------|------|
| POST | `/api/itinerary-builder/share` |
| GET | `/api/itinerary-builder/share/[token]` |
| POST | `/api/itinerary-builder/share/[token]/accept` |

## Contracts

- Responses used by chat/renderer: **structured JSON**, not Markdown.
- Chat APIs must not embed presentation HTML from the model.
- Domain reads for catalog content go through Knowledge services inside route handlers.
