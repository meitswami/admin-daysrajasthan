"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { QuotationDocument } from "@/components/itinerary-builder/quotation-document";
import { normalizeSnapshot } from "@/lib/itinerary-builder/normalize";
import { getClientItinerary, getRevisions } from "@/lib/itinerary-builder/storage";
import { logGeneratedDocument } from "@/lib/itinerary-builder/documents";
import type { ClientItineraryRecord, ItinerarySnapshot } from "@/types/itinerary-builder";
import { ArrowLeft, Printer } from "lucide-react";
import { useReportBrand } from "@/hooks/use-report-brand";

async function waitForDocumentImages(root: ParentNode = document) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        })
    )
  );
}

export function QuotationPrintView({ itineraryId }: { itineraryId: string }) {
  const brand = useReportBrand();
  const [record, setRecord] = useState<ClientItineraryRecord | null>(null);
  const [snapshot, setSnapshot] = useState<ItinerarySnapshot | null>(null);
  const [revisionId, setRevisionId] = useState("");
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const r = getClientItinerary(itineraryId);
    const revs = getRevisions(itineraryId);
    const current = revs.find((rev) => rev.id === r?.current_revision_id) ?? revs[0];
    if (r && current) {
      setRecord(r);
      setSnapshot(normalizeSnapshot(current.snapshot));
      setRevisionId(current.id);
      logGeneratedDocument({
        itinerary_id: r.id,
        revision_id: current.id,
        quote_id: r.quote_id,
        version_number: current.version_number,
        type: "quotation",
      });
    }
  }, [itineraryId]);

  const handlePrint = useCallback(async () => {
    if (!record || printing) return;
    setPrinting(true);
    const previousTitle = document.title;
    document.title = `${record.quote_id} · ${snapshot?.header.title ?? "Quotation"}`;
    try {
      const docRoot = document.querySelector(".quotation-document");
      if (docRoot) await waitForDocumentImages(docRoot);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      window.print();
    } finally {
      document.title = previousTitle;
      setPrinting(false);
    }
  }, [printing, record, snapshot?.header.title]);

  if (!record || !snapshot) {
    return (
      <div className="flex min-h-screen items-center justify-center text-stone-500">
        Loading quotation…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 print:bg-transparent">
      <div className="no-print sticky top-0 z-10 border-b border-stone-200 bg-white px-4 py-3 print:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <Link
            href={`/itinerary-builder/${itineraryId}/preview-confirm`}
            className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Preview & Confirm
          </Link>
          <Button
            type="button"
            size="sm"
            className="no-print"
            disabled={printing}
            onClick={() => void handlePrint()}
          >
            <Printer className="h-4 w-4" />
            {printing ? "Preparing…" : "Print / Save as PDF"}
          </Button>
        </div>
      </div>
      <div className="mx-auto max-w-4xl px-4 py-8 print:max-w-none print:p-0">
        <QuotationDocument
          quoteId={record.quote_id}
          versionNumber={record.current_version}
          revisionId={revisionId}
          snapshot={snapshot}
          brand={brand}
          categoryTotals={record.category_totals}
          mode="print"
        />
      </div>
    </div>
  );
}
