# ADR-005: Renderer Converts JSON to Surfaces

## Status

Accepted

## Context

Chat cards, itinerary timelines, quotations, PDFs, email, and WhatsApp each need different presentation. Putting markup generation inside Intelligence or API routes couples channels to models.

## Decision

**`modules/renderer`** is the only presentation adapter for Intelligence (and reusable for quotation/CRM outputs).

Contract: **structured JSON in → React / PDF / email / WhatsApp payloads out**.

Submodules: chat, timeline, package, quotation, pdf, email, whatsapp.

Renderer depends on **`modules/design-system`** for Royal Rajasthan tokens and card primitives — not ad-hoc colors.

## Consequences

- Pages and API routes stay thin
- Design changes land once in design-system + renderer
- Channel-specific formatting stays out of Intelligence
