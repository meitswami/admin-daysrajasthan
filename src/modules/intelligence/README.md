# Travel Intelligence Engine

Decision-making brain for every AI surface (Website, Admin, CRM, Quotation, portals, WhatsApp, Voice, Mobile).

**Not** a chatbot. **Not** an LLM wrapper. **DTO-only** — Renderer owns presentation.

## Hard rules

- Never query Supabase
- Never call Knowledge directly
- Always retrieve via **Search Engine** (Search → Knowledge → repos)
- Never invent prices, inclusions, destinations, hotels, weather, availability, policies, or distances
- Never return HTML or Markdown as the product contract

## Architecture

```
Client
  ↓
API Gateway
  ↓
Intelligence Engine (runIntelligence)
  ↓
Search Engine
  ↓
Knowledge Engine
  ↓
Supabase
  ↓
Context Builder → Prompt Builder → Provider
  ↓
Parser → Formatter → Validator → Safety
  ↓
Structured JSON (IntelligenceResult)
  ↓
Renderer
```

## Planner flow

```
User text + surface
  → Intent detection
  → Entity extraction
  → Decide needs:
      needAi?
      needSearch?
      needKnowledgeViaSearch?
      needQuotation?
      needCustomerData?
      needTravelMemory?
  → Only then retrieve / call provider
```

## Context flow

```
IntelligenceRequest
  → load Travel Memory (optional)
  → buildIntelligenceContext (same builder for website / CRM / quotation / portal / WhatsApp)
  → plan + retrieve + prompt
```

## Prompt flow

```
Intent + Entities
  + Retrieved Search facts
  + Travel Memory preferences
  + Surface context
  → provider-neutral ProviderPrompt
```

## Provider flow

```
selectProvider (HuggingFace → GitHub Models → OpenRouter → …)
  → complete(prompt)
  → Parser
If none available → Fallback
```

## Fallback flow

```
Provider unavailable / error
  ↓
Search results
  ↓
Knowledge (via Search)
  ↓
Structured fallback blocks
  ↓
Renderer
Never fail hard for consumers
```

## Travel Memory flow

```
Optional profile keyed by customerId or sessionId
  preferredBudget · hotel category · destinations · travel style
  children · seniors · adventure · luxury · vegetarian
  travel month · preferred language
  → injected into context/prompt
  → never treated as catalog facts
```

## Public API

```ts
import { runIntelligence } from "@/modules/intelligence";

const result = await runIntelligence({
  text: "Family trip to Udaipur 5 days",
  surface: "website",
});
// result.blocks — structured DTOs only
```

## Provider registration

```ts
import { registerProvider } from "@/modules/intelligence";

registerProvider({
  id: "openrouter",
  isAvailable: () => Boolean(process.env.OPENROUTER_API_KEY),
  complete: async (prompt) => { /* SDK call */ },
});
```

## Dependencies

- `search`, `shared` only

## Non-goals

- UI / pages / API routes
- Direct Supabase or Knowledge imports
- Pricing (Quotation Engine)
