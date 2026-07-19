/**
 * Supabase query layer — swap in lib/data/index.ts when connecting.
 */
import { createClient } from "@/lib/supabase/server";
import type {
  Blog,
  BlogCategory,
  BlogTag,
  ContactQuery,
  DashboardStats,
  Itinerary,
  ItineraryDownload,
  PackageInquiry,
  WhatsappLead,
} from "@/types/database";

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  const [contacts, inquiries, downloads, blogs, whatsapp] = await Promise.all([
    supabase.from("contact_queries").select("id", { count: "exact", head: true }),
    supabase.from("package_inquiries").select("id", { count: "exact", head: true }),
    supabase.from("itinerary_downloads").select("id", { count: "exact", head: true }),
    supabase.from("blogs").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("whatsapp_leads").select("id", { count: "exact", head: true }),
  ]);
  return {
    totalContactQueries: contacts.count ?? 0,
    totalInquiries: inquiries.count ?? 0,
    totalItineraryDownloads: downloads.count ?? 0,
    totalBlogs: blogs.count ?? 0,
    totalWhatsappLeads: whatsapp.count ?? 0,
  };
}

export async function fetchItineraries(): Promise<Itinerary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("itineraries").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      ...(row as Itinerary),
      created_by_id: (r.created_by as string | null) ?? (r.created_by_id as string | null) ?? null,
      created_by_name: (r.created_by_name as string | null) ?? null,
      inclusions: Array.isArray(r.inclusions) ? (r.inclusions as string[]) : [],
      exclusions: Array.isArray(r.exclusions) ? (r.exclusions as string[]) : [],
      gallery_urls: Array.isArray(r.gallery_urls) ? (r.gallery_urls as string[]) : [],
    };
  });
}

export async function fetchItineraryDownloads(): Promise<ItineraryDownload[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("itinerary_downloads")
    .select("*")
    .order("downloaded_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchContactQueries(): Promise<ContactQuery[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_queries")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchPackageInquiries(): Promise<PackageInquiry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("package_inquiries")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchBlogs(): Promise<Blog[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("blogs").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchBlogCategories(): Promise<BlogCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("blog_categories").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchBlogTags(): Promise<BlogTag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("blog_tags").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchBlogTagMap(): Promise<Record<string, string[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("blog_tag_map").select("blog_id, tag_id");
  if (error) throw error;
  const map: Record<string, string[]> = {};
  for (const row of data ?? []) {
    if (!map[row.blog_id]) map[row.blog_id] = [];
    map[row.blog_id].push(row.tag_id);
  }
  return map;
}

export async function fetchWhatsappLeads(): Promise<WhatsappLead[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("whatsapp_leads")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateInquiryStatus(id: string, status: PackageInquiry["status"]) {
  const supabase = await createClient();
  return supabase.from("package_inquiries").update({ status }).eq("id", id);
}

export async function updateContactStatus(id: string, status: ContactQuery["status"]) {
  const supabase = await createClient();
  return supabase.from("contact_queries").update({ status, resolved_at: status === "resolved" ? new Date().toISOString() : null }).eq("id", id);
}

export async function upsertBlog(blog: Partial<Blog> & { id?: string }) {
  const supabase = await createClient();
  if (blog.id) {
    return supabase.from("blogs").update(blog).eq("id", blog.id).select().single();
  }
  return supabase.from("blogs").insert(blog).select().single();
}

export async function markWhatsappSynced(id: string) {
  const supabase = await createClient();
  return supabase
    .from("whatsapp_leads")
    .update({ synced_to_crm: true, crm_synced_at: new Date().toISOString() })
    .eq("id", id);
}
