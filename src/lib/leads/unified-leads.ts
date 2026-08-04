/** Unified leads from website, WhatsApp, and contact form — Supabase when configured. */

import type { ContactQuery, PackageInquiry, WhatsappLead } from "@/types/database";
import { isSupabaseConfigured } from "@/lib/system/data-mode";

export type LeadSource = "website_inquiry" | "whatsapp" | "contact" | "email";

export type LeadStatus = "new" | "contacted" | "quoted" | "converted" | "closed";

export type UnifiedLead = {
  id: string;
  source: LeadSource;
  source_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  destination: string | null;
  travel_date: string | null;
  adults: number;
  children: number;
  package_hint: string | null;
  notes: string | null;
  status: LeadStatus;
  created_at: string;
  converted_quote_id: string | null;
};

const CONVERSIONS_KEY = "travel-days-lead-conversions-v1";

function loadConversions(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CONVERSIONS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function saveLeadConversion(leadKey: string, quoteId: string) {
  if (typeof window === "undefined") return;
  const map = loadConversions();
  map[leadKey] = quoteId;
  localStorage.setItem(CONVERSIONS_KEY, JSON.stringify(map));
}

export function getLeadConversion(leadKey: string): string | null {
  return loadConversions()[leadKey] ?? null;
}

function leadKey(source: LeadSource, sourceId: string) {
  return `${source}:${sourceId}`;
}

export function buildUnifiedLeadsFromRows(input: {
  inquiries: PackageInquiry[];
  whatsapp: WhatsappLead[];
  contacts: ContactQuery[];
}): UnifiedLead[] {
  const conversions = typeof window !== "undefined" ? loadConversions() : {};

  const inquiryLeads: UnifiedLead[] = input.inquiries.map((i) => ({
    id: leadKey("website_inquiry", i.id),
    source: "website_inquiry" as const,
    source_id: i.id,
    name: i.customer_name,
    email: i.email,
    phone: i.mobile,
    destination: i.destination,
    travel_date: i.travel_date,
    adults: i.adults,
    children: i.children,
    package_hint: i.destination,
    notes: i.additional_requirements,
    status: (i.status as LeadStatus) ?? "new",
    created_at: i.created_at,
    converted_quote_id: conversions[leadKey("website_inquiry", i.id)] ?? null,
  }));

  const waLeads: UnifiedLead[] = input.whatsapp.map((w) => ({
    id: leadKey("whatsapp", w.id),
    source: "whatsapp" as const,
    source_id: w.id,
    name: w.customer_name ?? "WhatsApp Lead",
    email: null,
    phone: w.phone,
    destination: w.destination,
    travel_date: null,
    adults: 2,
    children: 0,
    package_hint: w.selected_package,
    notes: w.landing_url,
    status: conversions[leadKey("whatsapp", w.id)] ? "converted" : "new",
    created_at: w.created_at,
    converted_quote_id: conversions[leadKey("whatsapp", w.id)] ?? null,
  }));

  const contactLeads: UnifiedLead[] = input.contacts.map((c) => ({
    id: leadKey("contact", c.id),
    source: "contact" as const,
    source_id: c.id,
    name: c.name,
    email: c.email,
    phone: c.mobile,
    destination: null,
    travel_date: null,
    adults: 2,
    children: 0,
    package_hint: c.subject,
    notes: c.message,
    status: conversions[leadKey("contact", c.id)] ? "converted" : "new",
    created_at: c.created_at,
    converted_quote_id: conversions[leadKey("contact", c.id)] ?? null,
  }));

  return [...inquiryLeads, ...waLeads, ...contactLeads].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/** @deprecated Prefer listUnifiedLeadsAsync — sync mock path removed. */
export function listUnifiedLeads(): UnifiedLead[] {
  return [];
}

export async function listUnifiedLeadsAsync(): Promise<UnifiedLead[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }
  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const [inq, wa, contacts] = await Promise.all([
      supabase.from("package_inquiries").select("*").order("created_at", { ascending: false }),
      supabase.from("whatsapp_leads").select("*").order("created_at", { ascending: false }),
      supabase.from("contact_queries").select("*").order("created_at", { ascending: false }),
    ]);
    return buildUnifiedLeadsFromRows({
      inquiries: (inq.data ?? []) as PackageInquiry[],
      whatsapp: (wa.data ?? []) as WhatsappLead[],
      contacts: (contacts.data ?? []) as ContactQuery[],
    });
  } catch (e) {
    console.warn("[leads] failed to load from Supabase", e);
    return [];
  }
}
