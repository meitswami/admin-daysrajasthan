/**
 * Data access layer — uses mock data now.
 * Replace implementations with Supabase queries when connecting (see lib/supabase/queries.ts).
 */
export {
  itineraries,
  itineraryDownloads,
  contactQueries,
  packageInquiries,
  blogs,
  blogCategories,
  blogTags,
  blogTagMap,
  whatsappLeads,
  getDashboardStats,
  getRecentActivity,
  getItineraryById,
  getDownloadsForItinerary,
  getInquiriesByEmail,
  getCategoryName,
  getTagsForBlog,
  IDS,
  crmSyncLogs,
} from "./mock-data";

export {
  websiteModuleVisibility,
  countries,
  destinations,
  cities,
  hotels,
  vehicles,
} from "./website-content";

export { getCustomerByEmail, getLinkedCustomers } from "./customer-links";
export { globalSearch, getLeadScore, summarizeInquiry, generateBlogSeo, activityToRoute } from "./search";

import { getDataMode, isSupabaseConfigured } from "@/lib/system/data-mode";

export const DATA_SOURCE = "mock" as "mock" | "supabase";

/** Use getDataSource() client-side for Dummy/Real toggle */
export function getDataSource(): "mock" | "supabase" {
  if (typeof window === "undefined") return DATA_SOURCE;
  return getDataMode() === "real" && isSupabaseConfigured() ? "supabase" : "mock";
}
