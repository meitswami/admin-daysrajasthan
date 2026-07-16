# Database

Same Supabase project. Prefer reuse. Knowledge Engine owns domain queries.

## Travel Days tables (reuse)

### Catalog / website (Knowledge)

- `website_countries` → knowledge countries / state expansion later
- `website_destinations` → `knowledge/destinations`
- `website_cities`
- `website_hotels` → `knowledge/hotels`
- `website_vehicles`
- `website_module_settings`
- `itineraries` → `knowledge/packages` (website packages)
- `blogs`, `blog_categories`, `blog_tags`, `blog_images`, `blog_tag_map` → `knowledge/blogs`
- `site_settings`, `web_pages` → settings / FAQ content as appropriate

### CRM / leads

- `contact_queries`
- `package_inquiries`
- `whatsapp_leads`
- `itinerary_downloads`
- `unified_leads`
- `td_customers`
- `crm_sync_logs`

### Quotation / team

- `client_itineraries`
- `itinerary_revisions`
- `itinerary_audit_logs`
- `pricing_change_log`
- `team_email_messages`

### Auth / system

- `admin_profiles`
- `td_team_members`
- `td_activity_logs`
- `td_system_settings` → intelligence settings keys (reuse; do not require `ai_settings` table unless needed)

## Kit concepts → action

| Concept | Action |
|---------|--------|
| destinations, hotels, packages, blogs | **Reuse** existing tables via Knowledge |
| places, activities, foods, weather, culture, shopping, travel_tips | **Add** when Knowledge needs them |
| package_days, package_places | **Add** if structured package content required |
| faqs | Prefer `web_pages` or small `faqs` only if structure demands |
| chat_sessions, chat_messages | **Add** for `modules/chat` |
| ai_cache, ai_logs | **Add** for intelligence cache/logging |
| ai_settings | Prefer `td_system_settings` keys |
| generated_itineraries | Prefer extend `client_itineraries` types + revisions; avoid parallel quote DB |
| states | **Add** only for multi-state Phase 7 |

## Knowledge Engine ownership

Application code that needs travel facts **must** go through `modules/knowledge/*`.

`lib/supabase` holds clients only. Domain SQL/query builders live under Knowledge (and CRM/quotation for their non-catalog tables).

## Planned Knowledge domains (tables may be shared or new)

```
destinations · packages · places · activities · foods · hotels
weather · culture · shopping · travel-tips · faq · blogs
```
