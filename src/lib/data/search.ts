import type { ActivityItem } from "@/types/database";
import {
  contactQueries,
  packageInquiries,
  itineraryDownloads,
  whatsappLeads,
  blogs,
  itineraries,
} from "./mock-data";

export type SearchResult = {
  id: string;
  type: "Inquiry" | "Contact" | "Download" | "WhatsApp" | "Blog" | "Itinerary";
  title: string;
  subtitle: string;
  href: string;
  status?: string;
};

const typeRoutes: Record<SearchResult["type"], string> = {
  Inquiry: "/inquiries",
  Contact: "/contacts",
  Download: "/itineraries",
  WhatsApp: "/whatsapp-leads",
  Blog: "/blogs",
  Itinerary: "/itineraries",
};

export function globalSearch(query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q || q.length < 2) return [];

  const results: SearchResult[] = [];

  for (const i of packageInquiries) {
    if (
      i.customer_name.toLowerCase().includes(q) ||
      i.email.toLowerCase().includes(q) ||
      (i.destination?.toLowerCase().includes(q) ?? false)
    ) {
      results.push({
        id: i.id,
        type: "Inquiry",
        title: i.customer_name,
        subtitle: `${i.destination ?? "Package"} · ${i.email}`,
        href: typeRoutes.Inquiry,
        status: i.status,
      });
    }
  }

  for (const c of contactQueries) {
    if (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.subject?.toLowerCase().includes(q) ?? false)
    ) {
      results.push({
        id: c.id,
        type: "Contact",
        title: c.name,
        subtitle: c.subject ?? c.email,
        href: typeRoutes.Contact,
        status: c.status,
      });
    }
  }

  for (const d of itineraryDownloads) {
    if (
      d.customer_name.toLowerCase().includes(q) ||
      d.email.toLowerCase().includes(q) ||
      d.package_name.toLowerCase().includes(q)
    ) {
      results.push({
        id: d.id,
        type: "Download",
        title: d.customer_name,
        subtitle: d.package_name,
        href: typeRoutes.Download,
        status: d.synced_to_crm ? "synced" : "pending",
      });
    }
  }

  for (const w of whatsappLeads) {
    if (
      w.phone.includes(q) ||
      (w.customer_name?.toLowerCase().includes(q) ?? false) ||
      (w.selected_package?.toLowerCase().includes(q) ?? false)
    ) {
      results.push({
        id: w.id,
        type: "WhatsApp",
        title: w.customer_name ?? w.phone,
        subtitle: w.selected_package ?? "WhatsApp lead",
        href: typeRoutes.WhatsApp,
        status: w.synced_to_crm ? "synced" : "pending",
      });
    }
  }

  for (const b of blogs) {
    if (b.title.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q)) {
      results.push({
        id: b.id,
        type: "Blog",
        title: b.title,
        subtitle: `/${b.slug}`,
        href: typeRoutes.Blog,
        status: b.status,
      });
    }
  }

  for (const it of itineraries) {
    if (
      it.package_name.toLowerCase().includes(q) ||
      (it.destination?.toLowerCase().includes(q) ?? false)
    ) {
      results.push({
        id: it.id,
        type: "Itinerary",
        title: it.package_name,
        subtitle: it.destination ?? "",
        href: typeRoutes.Itinerary,
        status: it.status,
      });
    }
  }

  return results.slice(0, 20);
}

export function getLeadScore(inquiry: {
  budget: string | null;
  travel_date: string | null;
  adults: number;
  children: number;
  status: string;
}): { score: number; label: "hot" | "warm" | "cold" } {
  let score = 50;
  if (inquiry.budget?.includes("2,00,000") || inquiry.budget?.includes("1,50,000")) score += 25;
  else if (inquiry.budget?.includes("1,00,000")) score += 15;
  if (inquiry.adults + inquiry.children >= 4) score += 10;
  if (inquiry.status === "quoted" || inquiry.status === "converted") score += 15;
  if (inquiry.travel_date) {
    const months = (new Date(inquiry.travel_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30);
    if (months >= 1 && months <= 6) score += 10;
  }
  score = Math.min(100, score);
  if (score >= 75) return { score, label: "hot" };
  if (score >= 55) return { score, label: "warm" };
  return { score, label: "cold" };
}

export function summarizeInquiry(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= 80) return trimmed;
  const sentences = trimmed.split(/[.!?]+/).filter(Boolean);
  return sentences[0]?.trim().slice(0, 120) + (sentences[0] && sentences[0].length > 120 ? "…" : ".") ||
    trimmed.slice(0, 120) + "…";
}

export function generateBlogSeo(title: string) {
  const base = title.trim();
  return {
    meta_title: `${base} | Travel Days Rajasthan`.slice(0, 60),
    meta_description: `Plan your ${base.toLowerCase()} with Travel Days Rajasthan — expert guides, curated packages & best prices.`.slice(0, 160),
    keywords: base.toLowerCase().split(/\s+/).filter((w) => w.length > 3).slice(0, 5).join(", "),
  };
}

export function activityToRoute(item: ActivityItem): string {
  switch (item.type) {
    case "Inquiry": return "/inquiries";
    case "Contact": return "/contacts";
    case "Download": return "/itineraries";
    case "WhatsApp": return "/whatsapp-leads";
    default: return "/dashboard";
  }
}
