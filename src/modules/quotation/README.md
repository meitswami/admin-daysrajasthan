# Quotation Workflow Engine

## Purpose

Reusable commercial quotation engine for **Website, Team Portal, Customer Portal, CRM, and AI**.

Pricing is **deterministic**. AI may explain quotes later — it is never the source of truth for money.

## Architecture

```
Customer Request
        ↓
 Knowledge Engine   (facts: packages, destinations, …)
        ↓
 Quotation Engine   (lifecycle · revisions · pricing · events)
        ↓
    Renderer        (JSON → UI / PDF / email / WhatsApp)
        ↓
 Customer / Team / Admin / CRM
```

### Internal layering

```
API / Portal / AI
        ↓
 quotation/service.ts     (workflow + orchestration)
        ↓
 quotation/pricing/*      (deterministic totals only)
        ↓
 quotation/repository.ts  (client_itineraries + revisions)
        ↓
 Storage / Supabase
```

## Status lifecycle

```
Draft → Generated → Sent → Viewed → Accepted
                              ↘ Rejected
                              ↘ Expired
 any active → Cancelled
```

## Responsibilities

- Draft / generate (including from Knowledge packages)
- Versioning & revisions
- Approval / commercial status transitions
- Deterministic pricing (taxes / discounts / coupons hooks ready)
- Domain events for CRM / Analytics / Notifications / AI Memory
- Renderer payload (`buildQuotationRenderPayload`) — no React here

## Dependencies

- `knowledge` (catalog facts only)
- `shared`
- Existing itinerary builder storage (reuse tables — no duplication)
- Future: `renderer`, `intelligence` (explain-only)

**Must not:** invent prices; put logic in pages; let AI mutate totals.

## Exported services

| Service | Role |
|---------|------|
| `createDraftQuotation` | Start draft |
| `generateQuotationFromKnowledge` | Knowledge → priced generated quote |
| `createQuotationRevision` | New version (priced) |
| `transitionQuotationStatus` / `markQuotationSent` / `Viewed` / `accept` / `reject` | Lifecycle |
| `listQuotations` / `getQuotation` / `listQuotationRevisions` | Reads |
| `buildQuotationRenderPayload` | JSON for Renderer |
| `priceSnapshot` / `summarizePricing` | Pricing sub-service |
| `onQuotationEvent` / `emitQuotationEvent` | Event hooks |

## Events

- `quotation.generated`
- `quotation.sent`
- `quotation.viewed`
- `quotation.accepted`
- `quotation.rejected`
- `quotation.expired`
- `quotation.cancelled`
- `quotation.revised`
- `quotation.status_changed`

Subscribe via `onQuotationEvent(type, handler)` or `onQuotationEvent("*", handler)`.

## Future roadmap

- Persist events to Supabase
- Coupon / promotion / seasonal pricing plug-ins
- AI-assisted day narrative (still priced here)
- Full `(team)` / `(customer)` routes consuming this engine only
