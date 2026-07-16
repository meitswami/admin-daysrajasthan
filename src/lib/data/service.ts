/**
 * Async data service — set DATA_SOURCE to "supabase" when connecting.
 * Pages can import from here instead of lib/data for live DB reads.
 */
import { DATA_SOURCE } from "./index";
import * as mock from "./mock-data";
import * as queries from "@/lib/supabase/queries";

export async function getItineraries() {
  return DATA_SOURCE === "supabase" ? queries.fetchItineraries() : mock.itineraries;
}

export async function getItineraryDownloads() {
  return DATA_SOURCE === "supabase" ? queries.fetchItineraryDownloads() : mock.itineraryDownloads;
}

export async function getContactQueries() {
  return DATA_SOURCE === "supabase" ? queries.fetchContactQueries() : mock.contactQueries;
}

export async function getPackageInquiries() {
  return DATA_SOURCE === "supabase" ? queries.fetchPackageInquiries() : mock.packageInquiries;
}

export async function getBlogs() {
  return DATA_SOURCE === "supabase" ? queries.fetchBlogs() : mock.blogs;
}

export async function getWhatsappLeads() {
  return DATA_SOURCE === "supabase" ? queries.fetchWhatsappLeads() : mock.whatsappLeads;
}

export async function getDashboardStats() {
  return DATA_SOURCE === "supabase" ? queries.fetchDashboardStats() : mock.getDashboardStats();
}
