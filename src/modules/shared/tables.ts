/**
 * Travel Days Supabase catalog — table names owned by this product.
 * Source of truth for MODULE_TABLE_OWNERSHIP.md inventory.
 */
export const TRAVEL_DAYS_TABLES = [
  "admin_profiles",
  "itineraries",
  "itinerary_downloads",
  "contact_queries",
  "package_inquiries",
  "whatsapp_leads",
  "crm_sync_logs",
  "blogs",
  "blog_categories",
  "blog_tags",
  "blog_images",
  "blog_tag_map",
  "website_countries",
  "website_destinations",
  "website_cities",
  "website_hotels",
  "website_vehicles",
  "website_module_settings",
  "site_settings",
  "web_pages",
  "client_itineraries",
  "itinerary_revisions",
  "itinerary_audit_logs",
  "pricing_change_log",
  "td_system_settings",
  "td_activity_logs",
  "td_team_members",
  "td_customers",
  "team_email_messages",
  "unified_leads",
] as const;

export type TravelDaysTableName = (typeof TRAVEL_DAYS_TABLES)[number];

export function isTravelDaysTable(name: string): boolean {
  return (TRAVEL_DAYS_TABLES as readonly string[]).includes(name);
}
