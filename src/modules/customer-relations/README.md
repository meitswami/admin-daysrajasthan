# Customer Relationship Platform (CRP)

Not a traditional CRM — a reusable **Customer Relationship Platform** for the full travel customer lifecycle.

## Architecture

```
Website · Customer Portal · Team Portal · Admin · AI · WhatsApp · Mobile (future)
                              ↓
                 Customer Relationship Platform
                              ↓
          Knowledge · Quotation · Search · Intelligence
```

## Customer lifecycle

```
Visitor → Lead → Inquiry → Qualified Lead → Quotation → Negotiation
 → Booking → Payment → Traveler → Completed Tour → Review → Repeat Customer
```

## Module responsibilities

| Area | Role |
|------|------|
| `leads/` | Aggregate website / WhatsApp / contact leads; qualify |
| `inquiries/` | Inquiry DTOs |
| `customers/` | Profiles + lifecycle advances |
| `timeline/` | Single chronological timeline for all surfaces |
| `communication/` | Email / WhatsApp / phone / chat / SMS / notes logs |
| `followups/` | Pending / completed / missed / scheduled / recurring |
| `assignments/` | Assigned to/by, priority, due, status |
| `notes/` | Private / public / pinned / attachments-ready |
| `activities/` | Activity feed building blocks |
| `events/` | Event **definitions** only (no listeners yet) |

## Timeline flow

```
Lead Created → Chat / Package Viewed → Quotation Generated → Quotation Viewed
 → Email / WhatsApp / Call → Booking → Payment → Trip Completed → Review → Repeat
```

Built by `buildCustomerTimeline()` / `buildTimelineRenderPayload()`.

## Communication flow

```
Channel adapters (future UI) → logCommunication() → repository store
 → activity + timeline → Renderer contracts (no UI in Task 08)
```

## Layering

```
Service (rules) → Repository (Supabase/mock/cache) → DTO → Renderer contracts
```

## Dependencies

- `shared`, `knowledge` (reads only when needed later), `quotation` (orchestration later)
- Reuses `package_inquiries`, `whatsapp_leads`, `contact_queries`, `td_customers`
- Extension store for notes/assignments/followups/comms until dedicated tables are approved  
  See `TABLE_OWNERSHIP.md`

## Frozen modules

Does **not** modify Knowledge Engine, Quotation Engine, or Design System.

## Future roadmap

- Wire quotation.accept / generate events into timeline
- Durable event bus listeners
- Scheduler for recurring follow-ups
- Portal UIs consuming render payloads
