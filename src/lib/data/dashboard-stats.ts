import type { DashboardStats } from "@/types/database";
import { isInDashboardPeriod, type DashboardPeriod } from "@/lib/utils/date-range";
import {
  blogs,
  contactQueries,
  itineraryDownloads,
  packageInquiries,
  whatsappLeads,
} from "./mock-data";

export function getDashboardStatsByPeriod(
  period: DashboardPeriod = "today",
  custom?: { from?: string; to?: string }
): DashboardStats {
  const inPeriod = (iso: string) => isInDashboardPeriod(iso, period, new Date(), custom);

  return {
    totalContactQueries: contactQueries.filter((r) => inPeriod(r.created_at)).length,
    totalInquiries: packageInquiries.filter((r) => inPeriod(r.created_at)).length,
    totalItineraryDownloads: itineraryDownloads.filter((r) => inPeriod(r.downloaded_at)).length,
    totalBlogs: blogs.filter(
      (b) => b.status === "published" && inPeriod(b.publish_date ?? b.created_at)
    ).length,
    totalWhatsappLeads: whatsappLeads.filter((r) => inPeriod(r.created_at)).length,
  };
}

export function getInquiryTrendLabel(period: DashboardPeriod): string | undefined {
  if (period !== "today") return undefined;
  const count = packageInquiries.filter((r) => isInDashboardPeriod(r.created_at, "today")).length;
  if (count === 0) return undefined;
  return `+${count} today`;
}
