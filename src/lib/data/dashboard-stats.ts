import type { DashboardStats } from "@/types/database";
import { isInDashboardPeriod, type DashboardPeriod } from "@/lib/utils/date-range";
import { isRealDataMode, isSupabaseConfigured } from "@/lib/system/data-mode";
import { createClient } from "@/lib/supabase/client";

const EMPTY_STATS: DashboardStats = {
  totalContactQueries: 0,
  totalInquiries: 0,
  totalItineraryDownloads: 0,
  totalBlogs: 0,
  totalWhatsappLeads: 0,
};

type RowWithDate = { created_at?: string | null; downloaded_at?: string | null; publish_date?: string | null; status?: string | null };

function countInPeriod(
  rows: RowWithDate[],
  period: DashboardPeriod,
  custom: { from?: string; to?: string } | undefined,
  field: "created_at" | "downloaded_at" | "publish_date"
) {
  return rows.filter((r) => {
    const iso = r[field] ?? r.created_at;
    if (!iso) return false;
    return isInDashboardPeriod(iso, period, new Date(), custom);
  }).length;
}

/** Live website dashboard stats from Supabase (Real mode). Never returns mock seed. */
export async function fetchDashboardStatsByPeriodLive(
  period: DashboardPeriod = "today",
  custom?: { from?: string; to?: string }
): Promise<DashboardStats> {
  if (!isSupabaseConfigured() || !isRealDataMode()) {
    return EMPTY_STATS;
  }

  try {
    const supabase = createClient();
    const [contacts, inquiries, downloads, blogs, whatsapp] = await Promise.all([
      supabase.from("contact_queries").select("created_at"),
      supabase.from("package_inquiries").select("created_at"),
      supabase.from("itinerary_downloads").select("downloaded_at"),
      supabase.from("blogs").select("created_at, publish_date, status").eq("status", "published"),
      supabase.from("whatsapp_leads").select("created_at"),
    ]);

    return {
      totalContactQueries: countInPeriod(contacts.data ?? [], period, custom, "created_at"),
      totalInquiries: countInPeriod(inquiries.data ?? [], period, custom, "created_at"),
      totalItineraryDownloads: countInPeriod(downloads.data ?? [], period, custom, "downloaded_at"),
      totalBlogs: countInPeriod(
        (blogs.data ?? []).map((b) => ({
          ...b,
          publish_date: b.publish_date ?? b.created_at,
        })),
        period,
        custom,
        "publish_date"
      ),
      totalWhatsappLeads: countInPeriod(whatsapp.data ?? [], period, custom, "created_at"),
    };
  } catch (e) {
    console.warn("[dashboard] stats fetch failed", e);
    return EMPTY_STATS;
  }
}

/** @deprecated sync helper — use fetchDashboardStatsByPeriodLive */
export function getDashboardStatsByPeriod(
  period: DashboardPeriod = "today",
  custom?: { from?: string; to?: string }
): DashboardStats {
  void period;
  void custom;
  return EMPTY_STATS;
}

export function getInquiryTrendLabel(_period: DashboardPeriod): string | undefined {
  return undefined;
}
