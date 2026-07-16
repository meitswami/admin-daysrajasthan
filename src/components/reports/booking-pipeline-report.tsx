"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ReportPageBanner } from "@/components/branding/document-brand";
import { useReportBrand } from "@/hooks/use-report-brand";
import { formatInr } from "@/lib/itinerary-builder/cost-engine";
import { listClientItineraries } from "@/lib/itinerary-builder/storage";
import { WORKFLOW_LABELS } from "@/types/itinerary-builder";
import { formatDate } from "@/lib/utils";
import { downloadCsv } from "@/lib/utils/csv";
import { Printer } from "lucide-react";

export function BookingPipelineReport() {
  const brand = useReportBrand();
  const rows = useMemo(() => listClientItineraries(), []);

  function exportCsv() {
    downloadCsv(
      "booking-pipeline-report.csv",
      [
        "Quote ID",
        "Client",
        "Title",
        "Travel Date",
        "Status",
        "Payment",
        "Grand Total",
        "Categories",
      ],
      rows.map((r) => [
        r.quote_id,
        r.client_name,
        r.title,
        r.travel_date ?? "",
        WORKFLOW_LABELS[r.workflow_status],
        r.payment_status,
        String(r.grand_total ?? ""),
        r.category_totals?.map((c) => `${c.label}: ${c.grand_total}`).join(" | ") ?? "",
      ])
    );
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-stone-600">
          {rows.length} active quote(s) from Itinerary Builder
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={exportCsv}>
            Export CSV
          </Button>
          <Button type="button" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print report
          </Button>
        </div>
      </div>

      <div className="print-report rounded-2xl border border-stone-200 bg-white p-4 sm:p-6">
        <ReportPageBanner brand={brand} reportTitle="Booking Pipeline Report" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-xs uppercase text-stone-500">
                <th className="py-2 pr-3">Quote</th>
                <th className="py-2 pr-3">Client</th>
                <th className="py-2 pr-3">Travel</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Payment</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-stone-100">
                  <td className="py-2.5 pr-3 font-medium text-amber-900">{r.quote_id}</td>
                  <td className="py-2.5 pr-3">
                    <p className="font-medium">{r.client_name}</p>
                    <p className="text-xs text-stone-500 line-clamp-1">{r.title}</p>
                  </td>
                  <td className="py-2.5 pr-3 text-stone-600">
                    {r.travel_date ? formatDate(r.travel_date) : "—"}
                  </td>
                  <td className="py-2.5 pr-3">{WORKFLOW_LABELS[r.workflow_status]}</td>
                  <td className="py-2.5 pr-3 capitalize">{r.payment_status}</td>
                  <td className="py-2.5 text-right tabular-nums font-medium">
                    {r.grand_total != null ? formatInr(r.grand_total) : "—"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-500">
                    No quotes in pipeline yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {rows.some((r) => (r.category_totals ?? []).length > 0) && (
          <div className="mt-6 break-inside-avoid">
            <h3 className="text-xs font-bold uppercase text-stone-600">Category pricing summary</h3>
            <div className="mt-2 space-y-2 text-xs text-stone-600">
              {rows
                .filter((r) => (r.category_totals ?? []).length > 0)
                .map((r) => (
                  <p key={r.id}>
                    <span className="font-medium text-stone-800">{r.quote_id}:</span>{" "}
                    {(r.category_totals ?? []).map((c) => `${c.label} ${formatInr(c.grand_total)}`).join(" · ")}
                  </p>
                ))}
            </div>
          </div>
        )}
        <footer className="mt-8 border-t border-stone-200 pt-3 text-center text-xs text-stone-500">
          {brand.reportFooter}
        </footer>
      </div>
    </div>
  );
}
