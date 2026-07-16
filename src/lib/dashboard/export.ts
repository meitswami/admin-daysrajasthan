import {
  blogs,
  contactQueries,
  itineraryDownloads,
  packageInquiries,
  whatsappLeads,
} from "@/lib/data/mock-data";
import { listClientItineraries } from "@/lib/itinerary-builder/storage";
import { WORKFLOW_LABELS } from "@/types/itinerary-builder";
import { downloadCsv } from "@/lib/utils/csv";
import { isInDashboardPeriod, type DashboardPeriod } from "@/lib/utils/date-range";

export function exportWebsiteDashboardCsv(
  period: DashboardPeriod,
  custom?: { from?: string; to?: string }
) {
  const inPeriod = (iso: string) => isInDashboardPeriod(iso, period, new Date(), custom);

  downloadCsv(
    `website-dashboard-${period}.csv`,
    ["Type", "Name", "Email", "Phone", "Detail", "Status", "Date"],
    [
      ...packageInquiries.filter((r) => inPeriod(r.created_at)).map((r) => [
        "Inquiry",
        r.customer_name,
        r.email,
        r.mobile ?? "",
        r.destination ?? "",
        r.status,
        r.created_at,
      ]),
      ...contactQueries.filter((r) => inPeriod(r.created_at)).map((r) => [
        "Contact",
        r.name,
        r.email,
        r.mobile ?? "",
        r.subject ?? "",
        r.status,
        r.created_at,
      ]),
      ...itineraryDownloads.filter((r) => inPeriod(r.downloaded_at)).map((r) => [
        "Download",
        r.customer_name,
        r.email,
        r.phone ?? "",
        r.package_name,
        r.synced_to_crm ? "synced" : "pending",
        r.downloaded_at,
      ]),
      ...whatsappLeads.filter((r) => inPeriod(r.created_at)).map((r) => [
        "WhatsApp",
        r.customer_name ?? "",
        "",
        r.phone,
        r.selected_package ?? r.destination ?? "",
        r.synced_to_crm ? "synced" : "pending",
        r.created_at,
      ]),
      ...blogs
        .filter((b) => b.status === "published" && inPeriod(b.publish_date ?? b.created_at))
        .map((b) => [
          "Blog",
          b.title,
          "",
          "",
          b.slug,
          b.status,
          b.publish_date ?? b.created_at,
        ]),
    ]
  );
}

export function exportItineraryBuilderCsv(
  period: DashboardPeriod,
  custom?: { from?: string; to?: string }
) {
  const records = listClientItineraries().filter((r) =>
    isInDashboardPeriod(r.created_at, period, new Date(), custom)
  );

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
      WORKFLOW_LABELS[r.workflow_status],
      r.payment_status,
      String(r.grand_total),
      r.travel_date ?? "",
      r.created_at,
    ])
  );
}
