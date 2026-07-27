"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { QuotationDocument } from "@/components/itinerary-builder/quotation-document";
import { formatInr } from "@/lib/itinerary-builder/cost-engine";
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
import type { ItinerarySnapshot } from "@/types/itinerary-builder";
import { CheckCircle2, Printer } from "lucide-react";
import { useReportBrand } from "@/hooks/use-report-brand";

export function ClientProposalView({
  token,
  quoteId,
  versionNumber,
  revisionId,
  snapshot,
  acceptedAt,
  acceptedByName,
  onAccept,
}: {
  token: string;
  quoteId: string;
  versionNumber: number;
  revisionId: string;
  snapshot: ItinerarySnapshot;
  acceptedAt: string | null;
  acceptedByName: string | null;
  onAccept?: (name: string, pin: string) => Promise<boolean>;
}) {
  const siteBrand = useReportBrand();
  const [name, setName] = useState(snapshot.client.client_name);
  const [pin, setPin] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(Boolean(acceptedAt));
  const [acceptedName, setAcceptedName] = useState(acceptedByName);
  const [structure, setStructure] = useState<CompanyStructure | null>(null);
  const [contacts, setContacts] = useState<PreviewContact[]>([]);
  const [payment, setPayment] = useState<PaymentDetails | undefined>(undefined);

  useEffect(() => {
    void getCompanyStructure().then((s) => {
      setStructure(s);
      setContacts(contactsFromStructure(s));
      setPayment(paymentDetailsFromStructure(s));
    });
  }, []);

  const brand = {
    ...siteBrand,
    companyName: siteBrand.companyName || "Rajasthan Touring",
    logoUrl: structure?.logo_url || siteBrand.logoUrl,
    address: formatStructureAddress(structure) || siteBrand.address,
    websiteUrl: structureWebsite(structure) || siteBrand.websiteUrl,
    phone: siteBrand.phone || "+919351549292",
    email: siteBrand.email || "rajasthantouringjaipur@gmail.com",
  };

  async function handleAccept() {
    if (!onAccept || !name.trim()) return;
    setAccepting(true);
    const ok = await onAccept(name.trim(), pin);
    setAccepting(false);
    if (ok) {
      setAccepted(true);
      setAcceptedName(name.trim());
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/80 to-stone-100 print:bg-transparent">
      <div className="no-print sticky top-0 z-10 border-b border-amber-200/60 bg-white/90 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
              Your travel proposal
            </p>
            <p className="font-bold text-stone-900">
              {quoteId} · v{versionNumber} · {formatInr(snapshot.cost_sheet.grand_total)}
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Print / PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-2 py-8 sm:px-4 print:max-w-none print:p-0">
        <QuotationDocument
          quoteId={quoteId}
          versionNumber={versionNumber}
          revisionId={revisionId}
          snapshot={snapshot}
          brand={brand}
          mode="screen"
          contacts={contacts}
          payment={payment}
          structure={structure}
        />

        {!accepted && onAccept && (
          <div className="no-print mt-8 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6">
            <h2 className="text-lg font-semibold text-emerald-900">Digital acceptance</h2>
            <p className="mt-1 text-sm text-emerald-800">
              By accepting, you agree to the terms above. This records your approval with timestamp.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="accept_name">Your full name</Label>
                <Input
                  id="accept_name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 bg-white"
                />
              </div>
              <Button
                type="button"
                className="w-full sm:w-auto"
                disabled={accepting || !name.trim()}
                onClick={handleAccept}
              >
                <CheckCircle2 className="h-4 w-4" />
                {accepting ? "Submitting…" : "Accept proposal"}
              </Button>
            </div>
          </div>
        )}

        {accepted && (
          <div className="no-print mt-8 flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-100/80 p-4 text-emerald-900">
            <CheckCircle2 className="h-8 w-8 shrink-0" />
            <div>
              <p className="font-semibold">Proposal accepted</p>
              <p className="text-sm">
                {acceptedName ?? acceptedByName} ·{" "}
                {acceptedAt ? new Date(acceptedAt).toLocaleString("en-IN") : "Just now"}
              </p>
            </div>
          </div>
        )}

        <p className="no-print mt-6 text-center text-xs text-stone-500">
          Secure link · Revision {revisionId.slice(0, 8)} · Token {token.slice(0, 8)}…
        </p>
      </div>
    </div>
  );
}
