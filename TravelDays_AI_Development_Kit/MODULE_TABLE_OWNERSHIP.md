# Module ↔ Table Ownership

Authority: `ARCHITECTURE.md` + `DATABASE.md`.  
Knowledge Engine owns **catalog/fact** reads from Supabase. Other modules own their operational tables; they must not invent travel facts outside Knowledge.

| Module | Owns (read/write primary) | May read via Knowledge | Must not |
|--------|---------------------------|------------------------|---------|
| `knowledge` | Domain queries for travel facts (see domains below) | — | Call intelligence providers |
| `search` | None directly | All catalog hydration | Raw SQL bypassing Knowledge |
| `intelligence` | `td_system_settings` keys for AI config (via settings helper); future `ai_cache` / `ai_logs` | Only through Knowledge + Search | Supabase catalog tables directly |
| `chat` | Future `chat_sessions`, `chat_messages` | — | Catalog tables |
| `crm` | `contact_queries`, `package_inquiries`, `whatsapp_leads`, `itinerary_downloads`, `unified_leads`, `td_customers`, `crm_sync_logs` | Packages/destinations for display | Invent travel facts |
| `quotation` | `client_itineraries`, `itinerary_revisions`, `itinerary_audit_logs`, `pricing_change_log` | Hotels/packages facts | Invent travel facts |
| `packages` (CMS) | Writes to `itineraries` (+ related) through Knowledge write APIs when built | — | — |
| `destinations` (CMS) | Writes to `website_destinations` (+ related) through Knowledge | — | — |
| `auth` / `team` | `admin_profiles`, `td_team_members` | — | — |
| `analytics` | Reads `td_activity_logs` + aggregates | — | — |
| `notifications` | `team_email_messages` (send path) | — | — |
| `renderer` / `design-system` | None | — | Database |

## Knowledge domains → existing tables

| Knowledge domain | Existing table(s) | Gap |
|------------------|-------------------|-----|
| `destinations` | `website_destinations` | Optional SEO/content columns later |
| `packages` | `itineraries` | `package_days` / `package_places` if structured days needed |
| `hotels` | `website_hotels` | — |
| `blogs` | `blogs`, `blog_*` | — |
| `faq` | `web_pages` (or dedicated `faqs` if required) | Decide at Knowledge DTO task |
| `places` | — | **Add when seeding Knowledge** |
| `activities` | — | **Add when seeding Knowledge** |
| `foods` | — | **Add when seeding Knowledge** |
| `weather` | — | **Add if product requires** |
| `culture` | — | **Add when seeding Knowledge** |
| `shopping` | — | **Add when seeding Knowledge** |
| `travel-tips` | — | **Add when seeding Knowledge** |

Supporting catalog: `website_countries`, `website_cities`, `website_vehicles`, `website_module_settings`, `site_settings`.

## Travel Days table inventory

- `admin_profiles`, `itineraries`, `itinerary_downloads`
- `contact_queries`, `package_inquiries`, `whatsapp_leads`, `crm_sync_logs`
- `blogs`, `blog_categories`, `blog_tags`, `blog_images`, `blog_tag_map`
- `website_countries`, `website_destinations`, `website_cities`, `website_hotels`, `website_vehicles`, `website_module_settings`
- `site_settings`, `web_pages`
- `client_itineraries`, `itinerary_revisions`, `itinerary_audit_logs`, `pricing_change_log`
- `td_system_settings`, `td_activity_logs`, `td_team_members`, `td_customers`
- `team_email_messages`, `unified_leads`
