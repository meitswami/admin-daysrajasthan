# CRP Table Ownership

| Existing table | Module owner | Purpose | Extension required? | Reason |
|----------------|--------------|---------|---------------------|--------|
| `package_inquiries` | customer-relations (leads) | Website package inquiries → Lead DTOs | No | Reused as-is |
| `whatsapp_leads` | customer-relations (leads) | WhatsApp click leads | No | Reused as-is |
| `contact_queries` | customer-relations (leads/inquiries) | Contact form → lead + inquiry | No | Reused as-is |
| `unified_leads` | customer-relations (future sync) | Normalized lead index | Optional later | Prefer source tables + DTO unify for now |
| `td_customers` | customer-relations (customers) | Customer master | No | Reused via `ensureCustomer` |
| `itinerary_downloads` | customer-relations (future) | Download leads | Optional | Can map as lead channel later |
| `client_itineraries` | quotation (frozen) | Quotes / bookings | No write from CRP in Task 08 | Link by id only |
| `team_email_messages` | notifications / team | Mailbox | Optional link | Communication log can reference later |
| `crm_sync_logs` | crm sync | External CRM webhook log | No | Out of CRP core |

## Extension store (no new DB tables in Task 08)

| Entity | Storage | Future table when approved |
|--------|---------|----------------------------|
| Notes | CRP in-memory store | `crp_notes` |
| Assignments | CRP in-memory store | `crp_assignments` |
| Follow-ups | CRP in-memory store | `crp_followups` |
| Communications | CRP in-memory store | `crp_communications` |
| Activities | CRP in-memory store | `crp_activities` |
| Lead overrides (qualification links) | CRP in-memory store | columns on `unified_leads` or shadow table |

No duplicate copies of Travel Days lead/customer master rows.
