# UI / UX Guidelines

## Brand

Royal Rajasthan:

- Cream
- Maroon
- Gold
- Elegant motion
- Premium, calm, heritage — not generic SaaS purple

Owned by: `modules/design-system` (`theme`, `tokens`, `icons`, `animations`, `cards`).

All chat cards and branded marketing surfaces must consume design-system tokens — do not hardcode one-off palettes in the widget.

## Surfaces

| Surface | Feel |
|---------|------|
| `(website)` | Full brand: cream/maroon/gold, expressive type, hero atmosphere |
| `(admin)` / `(team)` | Quieter operational UI; still token-aligned accents |
| `(customer)` | Branded portal, proposal-first |
| Chat widget | Design-system cards; matches website branding |

## Chat features

- Floating widget (`modules/chat/widget`)
- Rich cards via `modules/renderer/chat` + `design-system/cards`
- Timeline itinerary (`modules/renderer/timeline`)
- Suggested prompts (`modules/search/suggestions`)
- Share link
- Download PDF (`modules/renderer/pdf`)
- WhatsApp CTA (`modules/renderer/whatsapp`)
- Mobile responsive

## Renderer contract

Intelligence / APIs return **structured JSON**.  
Renderer maps JSON → React (and PDF/email/WhatsApp payloads).  
Do not render model Markdown as the primary UI.

## Motion

Use design-system animations for presence and hierarchy (widget open, card enter, timeline reveal) — 2–3 intentional motions, not noise.
