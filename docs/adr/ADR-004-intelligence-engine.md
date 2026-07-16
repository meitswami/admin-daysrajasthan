# ADR-004: Intelligence Engine Returns JSON Only

## Status

Accepted

## Context

The platform needs Website AI, CRM AI, WhatsApp AI, Customer/Team AI, and later Voice AI. Coupling channel UI to raw LLM Markdown would break branding and multi-channel reuse.

## Decision

- Module name: **`modules/intelligence`** (not `ai`)
- Pipeline: intent → planner → Search + Knowledge → prompt → provider → formatter → validator → **structured JSON**
- Intelligence **must not** query Supabase directly
- Presentation is owned by **`modules/renderer`**
- Channels are owned by **`modules/chat`** (and future transports)

Submodules: providers, retrieval, prompt-builder, formatter, planner, cache, memory, validator, logging.

## Consequences

- One brain, many channels
- Failover can return Search/Knowledge structured results without invented prose
- Provider swap does not change UI contracts
