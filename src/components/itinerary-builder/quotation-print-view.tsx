"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { QuotationDocument } from "@/components/itinerary-builder/quotation-document";
import { normalizeSnapshot } from "@/lib/itinerary-builder/normalize";
import { getClientItinerary, getRevisions } from "@/lib/itinerary-builder/storage";
import { logGeneratedDocument } from "@/lib/itinerary-builder/documents";
import { getCompanyStructure } from "@/lib/master-data/structure-store";
import {
  contactsFromStructure,
  formatStructureAddress,
  structureWebsite,
} from "@/lib/itinerary-builder/quotation-contacts";
import {
  paymentDetailsFromStructure,
  type PaymentDetails,
} from "@/lib/itinerary-builder/payment-details";
import type { PreviewContact } from "@/lib/itinerary-builder/policy-master";
import type { CompanyStructure } from "@/types/company-structure";
import type { CategoryTotalSummary, ClientItineraryRecord, ItinerarySnapshot } from "@/types/itinerary-builder";
import {
  getPreviewTheme,
} from "@/lib/itinerary-builder/preview-themes";
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

async function publishQuotationPayload(input: {
  itineraryId: string;
  quoteId: string;
  versionNumber: number;
  revisionId: string;
  clientName: string;
  snapshot: ItinerarySnapshot;
  categoryTotals: CategoryTotalSummary[];
}) {
  try {
    await fetch(`/api/public/quotation/${input.itineraryId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quote_id: input.quoteId,
        version_number: input.versionNumber,
        revision_id: input.revisionId,
        client_name: input.clientName,
        snapshot: input.snapshot,
        category_totals: input.categoryTotals,
      }),
    });
  } catch {
    // Public publish is best-effort (localStorage still works same-browser).
  }
}

export function QuotationPrintView({
  itineraryId,
  publicMode = false,
}: {
  itineraryId: string;
  publicMode?: boolean;
}) {
  const siteBrand = useReportBrand();
  const [record, setRecord] = useState<ClientItineraryRecord | null>(null);
  const [snapshot, setSnapshot] = useState<ItinerarySnapshot | null>(null);
  const [revisionId, setRevisionId] = useState("");
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotalSummary[]>([]);
  const [printing, setPrinting] = useState(false);
  const [structure, setStructure] = useState<CompanyStructure | null>(null);
  const [contacts, setContacts] = useState<PreviewContact[]>([]);
  const [payment, setPayment] = useState<PaymentDetails | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      void getCompanyStructure().then((s) => {
        if (cancelled) return;
        setStructure(s);
        setContacts(contactsFromStructure(s));
        setPayment(paymentDetailsFromStructure(s));
      });

      // Prefer published public payload (works without login / across sessions).
      try {
        const res = await fetch(`/api/public/quotation/${itineraryId}`);
        if (res.ok) {
          const json = await res.json();
          if (!cancelled && json?.snapshot) {
            setRecord({
              id: itineraryId,
              quote_id: json.quote_id,
              current_version: json.version_number,
              client_name: json.client_name,
              category_totals: json.category_totals ?? [],
            } as ClientItineraryRecord);
            setSnapshot(normalizeSnapshot(json.snapshot));
            setRevisionId(json.revision_id);
            setCategoryTotals(json.category_totals ?? []);
            return;
          }
        }
      } catch {
        // fall through to local storage
      }

      const r = getClientItinerary(itineraryId);
      const revs = getRevisions(itineraryId);
      const current = revs.find((rev) => rev.id === r?.current_revision_id) ?? revs[0];
      if (r && current) {
        const snap = normalizeSnapshot(current.snapshot);
        if (!cancelled) {
          setRecord(r);
          setSnapshot(snap);
          setRevisionId(current.id);
          setCategoryTotals(r.category_totals ?? []);
          logGeneratedDocument({
            itinerary_id: r.id,
            revision_id: current.id,
            quote_id: r.quote_id,
            version_number: current.version_number,
            type: "quotation",
          });
          void publishQuotationPayload({
            itineraryId: r.id,
            quoteId: r.quote_id,
            versionNumber: current.version_number,
            revisionId: current.id,
            clientName: r.client_name,
            snapshot: snap,
            categoryTotals: r.category_totals ?? [],
          });
        }
        return;
      }

      if (!cancelled) setLoadError("Quotation not found or not yet published.");
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [itineraryId]);

  const brand = {
    ...siteBrand,
    companyName: siteBrand.companyName || "Rajasthan Touring",
    logoUrl: structure?.logo_url || siteBrand.logoUrl,
    address: formatStructureAddress(structure) || siteBrand.address,
    websiteUrl: structureWebsite(structure) || siteBrand.websiteUrl,
    phone: siteBrand.phone || "+919351549292",
    email: siteBrand.email || "rajasthantouringjaipur@gmail.com",
  };

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

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 p-6 text-center text-stone-600">
        {loadError}
      </div>
    );
  }

  if (!record || !snapshot) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 text-stone-500">
        Loading quotation…
      </div>
    );
  }

  const theme = getPreviewTheme(snapshot.preview_theme);
  const bookAccent = theme.id === 2 ? "#56AB2F" : theme.id === 3 ? "#7B1E2E" : "#D97706";

  return (
    <div className="min-h-screen bg-stone-100 print:bg-transparent">
      <div className="no-print sticky top-0 z-10 border-b border-stone-200 bg-white px-4 py-3 print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          {publicMode ? (
            <p className="text-sm font-semibold text-stone-800">
              {brand.companyName} · {record.quote_id}
            </p>
          ) : (
            <Link
              href={`/itinerary-builder/${itineraryId}/preview-confirm`}
              className="inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Preview & Confirm
            </Link>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="no-print text-white hover:opacity-90"
              style={{ backgroundColor: bookAccent }}
              onClick={() => {
                const el = document.getElementById("book");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Book Now
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="no-print"
              style={{ borderColor: bookAccent, color: bookAccent }}
              disabled={printing}
              onClick={() => void handlePrint()}
            >
              <Printer className="h-4 w-4" />
              {printing ? "Preparing…" : "Print"}
            </Button>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-2 py-6 sm:px-4 print:max-w-none print:p-0" id="book">
        <QuotationDocument
          quoteId={record.quote_id}
          versionNumber={record.current_version}
          revisionId={revisionId}
          snapshot={snapshot}
          brand={brand}
          categoryTotals={categoryTotals.length ? categoryTotals : record.category_totals}
          mode="print"
          contacts={contacts}
          payment={payment}
          structure={structure}
        />
      </div>
    </div>
  );
}
