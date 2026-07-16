# ADR-002: Supabase as System of Record

## Status

Accepted

## Context

TravelDays needs durable storage for packages, destinations, leads, quotations, chat history, and future knowledge content. Options included a new database project vs continuing with the existing Supabase project.

## Decision

- Use the **existing Supabase project** for Travel Days
- Prefer **reuse** of existing Travel Days tables (`itineraries`, `website_*`, leads, `client_itineraries`, …)
- Add tables only when no fit exists
- `lib/supabase` holds clients only; **catalog/fact queries belong in `modules/knowledge`**
- Application `DATA_SOURCE` may remain mock until Knowledge is seeded

## Consequences

- Knowledge Engine is the application boundary for travel facts
- Schema changes require ownership review (`MODULE_TABLE_OWNERSHIP.md`)
- Operational modules (CRM, quotation) own their non-catalog tables
