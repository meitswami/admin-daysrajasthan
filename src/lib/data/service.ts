/**
 * Async data service — always prefers Supabase when configured.
 * Pages must import from here (not mock-data) for live DB reads.
 */
import { getDataSource } from "./index";
import * as mock from "./mock-data";
import * as queries from "@/lib/supabase/queries";

function source(): "mock" | "supabase" {
  return getDataSource();
}

export async function getItineraries() {
  return source() === "supabase" ? queries.fetchItineraries() : mock.itineraries;
}

export async function getItineraryDownloads() {
  return source() === "supabase" ? queries.fetchItineraryDownloads() : mock.itineraryDownloads;
}

export async function getContactQueries() {
  return source() === "supabase" ? queries.fetchContactQueries() : mock.contactQueries;
}

export async function getPackageInquiries() {
  return source() === "supabase" ? queries.fetchPackageInquiries() : mock.packageInquiries;
}

export async function getBlogs() {
  return source() === "supabase" ? queries.fetchBlogs() : mock.blogs;
}

export async function getBlogCategories() {
  return source() === "supabase" ? queries.fetchBlogCategories() : mock.blogCategories;
}

export async function getBlogTags() {
  return source() === "supabase" ? queries.fetchBlogTags() : mock.blogTags;
}

export async function getBlogTagMap() {
  return source() === "supabase" ? queries.fetchBlogTagMap() : mock.blogTagMap;
}

export async function getWhatsappLeads() {
  return source() === "supabase" ? queries.fetchWhatsappLeads() : mock.whatsappLeads;
}

export async function getDashboardStats() {
  return source() === "supabase" ? queries.fetchDashboardStats() : mock.getDashboardStats();
}
