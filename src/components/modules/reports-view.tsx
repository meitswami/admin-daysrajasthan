"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageMain } from "@/components/ui/data-table";
import { ReportPageBanner } from "@/components/branding/document-brand";
import { BookingPipelineReport } from "@/components/reports/booking-pipeline-report";
import { useReportBrand } from "@/hooks/use-report-brand";
import { downloadCsv } from "@/lib/utils/csv";
import {
  contactQueries,
  packageInquiries,
  itineraryDownloads,
  whatsappLeads,
} from "@/lib/data";
import { Download, FileSpreadsheet } from "lucide-react";

const reportConfigs = [
  {
    name: "Inquiry Report",
    filename: "inquiry-report.csv",
    description: "All package inquiry submissions",
    count: packageInquiries.length,
    fields: ["Customer", "Destination", "Travel Date", "Budget", "Status"],
    export: () =>
      downloadCsv(
        "inquiry-report.csv",
        ["Customer", "Email", "Destination", "Travel Date", "Adults", "Children", "Budget", "Status", "Source"],
        packageInquiries.map((r) => [
          r.customer_name,
          r.email,
          r.destination ?? "",
          r.travel_date ?? "",
          String(r.adults),
          String(r.children),
          r.budget ?? "",
          r.status,
          r.source_page ?? "",
        ])
      ),
  },
  {
    name: "Contact Report",
    filename: "contact-report.csv",
    description: "Contact Us form submissions",
    count: contactQueries.length,
    fields: ["Name", "Email", "Subject", "Message", "Status"],
    export: () =>
      downloadCsv(
        "contact-report.csv",
        ["Name", "Email", "Mobile", "Subject", "Message", "Status", "Date"],
        contactQueries.map((r) => [
          r.name,
          r.email,
          r.mobile ?? "",
          r.subject ?? "",
          r.message,
          r.status,
          r.created_at,
        ])
      ),
  },
  {
    name: "Download Report",
    filename: "download-report.csv",
    description: "Itinerary PDF download records",
    count: itineraryDownloads.length,
    fields: ["Customer", "Package", "Email", "Source Page", "Date"],
    export: () =>
      downloadCsv(
        "download-report.csv",
        ["Customer", "Package", "Email", "Phone", "Source", "Date", "CRM Synced"],
        itineraryDownloads.map((r) => [
          r.customer_name,
          r.package_name,
          r.email,
          r.phone ?? "",
          r.source_page ?? "",
          r.downloaded_at,
          r.synced_to_crm ? "yes" : "no",
        ])
      ),
  },
  {
    name: "WhatsApp Lead Report",
    filename: "whatsapp-report.csv",
    description: "WhatsApp conversation leads",
    count: whatsappLeads.length,
    fields: ["Phone", "Package", "Destination", "Landing URL", "CRM Sync"],
    export: () =>
      downloadCsv(
        "whatsapp-report.csv",
        ["Name", "Phone", "Package", "Destination", "Source", "Landing URL", "CRM Synced"],
        whatsappLeads.map((r) => [
          r.customer_name ?? "",
          r.phone,
          r.selected_package ?? "",
          r.destination ?? "",
          r.source_page ?? "",
          r.landing_url ?? "",
          r.synced_to_crm ? "yes" : "no",
        ])
      ),
  },
];

export function ReportsView() {
  const brand = useReportBrand();

  return (
    <PageMain>
      <ReportPageBanner brand={brand} reportTitle="Reports & exports" />

      <Card className="mb-6 border-amber-200/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Booking Pipeline Report</CardTitle>
          <CardDescription>
            Branded printable summary of all Itinerary Builder quotes — logo and company details from Admin Settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BookingPipelineReport />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {reportConfigs.map((report) => (
          <Card key={report.name} className="border-stone-200/80 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{report.name}</CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </div>
                <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-semibold text-amber-800">
                  {report.count}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-1">
                {report.fields.map((f) => (
                  <span key={f} className="rounded-md bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{f}</span>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={report.export}>
                  <FileSpreadsheet className="h-4 w-4" /> Excel / CSV
                </Button>
                <Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={report.export}>
                  <Download className="h-4 w-4" /> Download
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageMain>
  );
}
