# Intelligence Engine

Location: `modules/intelligence`

The Intelligence Engine powers Website AI, CRM AI, WhatsApp AI, Customer Portal AI, Team AI, Quotation AI, and future Voice / Mobile AI.

It is **not** the source of truth. It only plans and narrates over facts retrieved through **Search** (which hydrates via **Knowledge**).

---

## Hard constraints

- Never query Supabase directly.
- Never call Knowledge directly — always Search.
- Never invent travel facts or prices.
- Never return HTML / Markdown as the product contract — **structured JSON only**.
- Presentation belongs to `modules/renderer`.
- Channel UX belongs to `modules/chat` (and future transports).

---

## Submodules

```
modules/intelligence/
  planner/           # Intent, entities, needAi/Search/Quotation/Memory
  orchestrator/      # Search-only retrieval
  context-builder/   # Shared context for all surfaces
  prompt-builder/    # Provider-neutral prompts
  provider/          # HF / GitHub Models / OpenRouter / future local·Azure·OpenAI·Anthropic
  parser/            # Model text → draft
  formatter/         # → Intelligence blocks
  validator/         # Schema + grounding
  safety/            # No invented prices
  memory/            # Travel Memory (preferences)
  cache/             # Future ai_cache
  logging/           # Traces
  telemetry/         # Latency / fallback metrics
```

---

## Pipeline

```
Intent detection
  → Entity extraction
  → Planner (needs)
  → Search (candidates; Knowledge via Search)
  → Context + Prompt builder
  → Provider (or fallback)
  → Parser → Formatter → Validator → Safety
  → Structured JSON
  → Renderer
```

---

## Fallback

If provider unavailable:

Search → Knowledge (via Search) → structured blocks → Renderer

Never fail hard for consumers.

---

## Related modules

- `modules/search` — only discovery path used by Intelligence
- `modules/knowledge` — reached only through Search
- `modules/api-gateway` — external entry for `/api/*` consumers
- `modules/renderer` — JSON → UI / PDF / email / WhatsApp
- `modules/chat` — sessions / widget / channel transports
