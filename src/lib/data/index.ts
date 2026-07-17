/**
 * Data access layer — Supabase is the live source for packages / leads / blogs.
 * Mock exports remain available for local UI demos only.
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

/** Chat Knowledge, admin lists, and server APIs read from Supabase when configured. */
export const DATA_SOURCE = "supabase" as "mock" | "supabase";

/** Use getDataSource() client-side for Dummy/Real toggle */
export function getDataSource(): "mock" | "supabase" {
  if (!isSupabaseConfigured()) return "mock";
  if (typeof window === "undefined") return DATA_SOURCE;
  return getDataMode() === "dummy" ? "mock" : "supabase";
}
