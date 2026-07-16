# Universal Renderer Engine

Converts DTOs into presentation models for every surface.

Intelligence never knows HTML, React, or Tailwind — **Renderer owns all presentation**.

## Hard rules

- Never query databases
- Never call Search, Supabase, or AI Providers
- Consume **DTOs only**
- Always theme via `modules/design-system` (no duplicated tokens)

## Renderer pipeline

```
Intelligence DTO (or any RendererInputDocument)
  ↓
validate input + options
  ↓
buildThemeContext (Royal Rajasthan · light/dark · a11y)
  ↓
mapDocumentBlocks (DTO → PresentationBlock[])
  ↓
attach SEO + metadata
  ↓
output adapter (react | pdf | email | whatsapp | json | native_mobile_future)
  ↓
Website / Chat / Portals / Email / PDF / WhatsApp / Mobile
```

## DTO mapping

| Input `kind` | Presentation |
|--------------|--------------|
| `message` / `summary` / `fallback_browse` | `chat_message` |
| `package_list` | `package_card[]` |
| `destination_list` | `destination_card[]` |
| `itinerary_outline` | `timeline` + `itinerary` |
| `comparison` | `package_comparison` |
| `quotation_hint` | `quotation` (+ price disclaimer) |
| `gallery` / `weather` / `map` / `tips` / `faq` | matching models |

## Presentation flow

```
PresentationBlock[]
  → Chat · Cards · Timeline · Tables · Gallery · Maps
  → SEO / Metadata
  → Channel adapters
```

## Output types

| Type | Adapter |
|------|---------|
| `react` | Presentation tree descriptors (surfaces bind to components) |
| `pdf` | Document sections model |
| `email` | HTML skeleton + plain text |
| `whatsapp` | Message lines |
| `json` | Structured presentation JSON |
| `native_mobile_future` | Screen bundle stub |

## Theme

- Royal Rajasthan via design-system tokens
- Light / dark mode remapping
- Animation preset names exposed for surfaces
- Responsive + a11y flags (`reducedMotion`, `highContrast`)

## Public API

```ts
import { renderDocument, renderIntelligenceDto } from "@/modules/renderer";

const out = renderDocument(
  { blocks: intelligenceResult.blocks },
  { outputType: "react", mode: "light", surface: "website" }
);
```

## Dependencies

- `design-system`, `shared` only

## Future components (models reserved)

Trip Timeline · Pricing Table · Comparison Table · Booking CTA · Download PDF · Share Link · Gallery Carousel
