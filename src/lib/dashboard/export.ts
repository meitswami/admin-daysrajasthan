import { listClientItineraries } from "@/lib/itinerary-builder/storage";
import { WORKFLOW_LABELS } from "@/types/itinerary-builder";
import { downloadCsv } from "@/lib/utils/csv";
import { isInDashboardPeriod, type DashboardPeriod } from "@/lib/utils/date-range";
import { createClient } from "@/lib/supabase/client";
import { isRealDataMode, isSupabaseConfigured } from "@/lib/system/data-mode";

export async function exportWebsiteDashboardCsv(
  period: DashboardPeriod,
  custom?: { from?: string; to?: string }
) {
  const inPeriod = (iso: string) => isInDashboardPeriod(iso, period, new Date(), custom);
  const rows: (string | number)[][] = [];

  if (isSupabaseConfigured() && isRealDataMode()) {
    const supabase = createClient();
    const [inquiries, contacts, downloads, whatsapp, blogs] = await Promise.all([
      supabase.from("package_inquiries").select("*"),
      supabase.from("contact_queries").select("*"),
      supabase.from("itinerary_downloads").select("*"),
      supabase.from("whatsapp_leads").select("*"),
      supabase.from("blogs").select("*").eq("status", "published"),
    ]);

    for (const r of inquiries.data ?? []) {
      if (!inPeriod(r.created_at)) continue;
      rows.push(["Inquiry", r.customer_name, r.email, r.mobile ?? "", r.destination ?? "", r.status, r.created_at]);
    }
    for (const r of contacts.data ?? []) {
      if (!inPeriod(r.created_at)) continue;
      rows.push(["Contact", r.name, r.email, r.mobile ?? "", r.subject ?? "", r.status, r.created_at]);
    }
    for (const r of downloads.data ?? []) {
      if (!inPeriod(r.downloaded_at)) continue;
      rows.push([
        "Download",
        r.customer_name,
        r.email,
        r.phone ?? "",
        r.package_name,
        r.synced_to_crm ? "synced" : "pending",
        r.downloaded_at,
      ]);
    }
    for (const r of whatsapp.data ?? []) {
      if (!inPeriod(r.created_at)) continue;
      rows.push([
        "WhatsApp",
        r.customer_name ?? "",
        "",
        r.phone,
        r.selected_package ?? r.destination ?? "",
        r.synced_to_crm ? "synced" : "pending",
        r.created_at,
      ]);
    }
    for (const b of blogs.data ?? []) {
      const date = b.publish_date ?? b.created_at;
      if (!inPeriod(date)) continue;
      rows.push(["Blog", b.title, "", "", b.slug, b.status, date]);
    }
  }

  downloadCsv(`website-dashboard-${period}.csv`, ["Type", "Name", "Email", "Phone", "Detail", "Status", "Date"], rows.map((r) => r.map(String)));
}

export function exportItineraryBuilderCsv(
  period: DashboardPeriod,
  custom?: { from?: string; to?: string }
) {
  const records = listClientItineraries().filter((r) => {
    const name = (r.client_name ?? "").trim().toLowerCase();
    if (name === "website package" || name === "") return false;
    return isInDashboardPeriod(r.created_at, period, new Date(), custom);
  });

  downloadCsv(
    `itinerary-builder-${period}.csv`,
    [
      "Quote ID",
      "Client",
      "Email",
      "Phone",
      "Title",
      "Status",
      "Payment",
      "Grand Total",
      "Travel Date",
      "Created",
    ],
    records.map((r) => [
      r.quote_id,
      r.client_name,
      r.client_email ?? "",
      r.client_phone ?? "",
      r.title,
      WORKFLOW_LABELS[r.workflow_status] ?? r.workflow_status,
      r.payment_status,
      String(r.grand_total),
      r.travel_date ?? "",
      r.created_at,
    ])
  );
}
