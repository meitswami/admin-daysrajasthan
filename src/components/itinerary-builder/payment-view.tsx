"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  advanceRateFromPercent,
  bookingAdvance,
  formatInr,
} from "@/lib/itinerary-builder/cost-engine";
import { normalizeSnapshot } from "@/lib/itinerary-builder/normalize";
import {
  clampAdvancePercent,
  DUMMY_PAYMENT_DETAILS,
  type AdvancePercent,
} from "@/lib/itinerary-builder/payment-details";
import { themeShellClass } from "@/lib/itinerary-builder/preview-themes";
import {
  getClientItinerary,
  getRevisions,
  saveSnapshotRevision,
  updatePaymentStatus,
} from "@/lib/itinerary-builder/storage";
import type { ClientItineraryRecord, ItinerarySnapshot } from "@/types/itinerary-builder";
import { cn } from "@/lib/utils";
import {
  Building2,
  Check,
  Copy,
  CreditCard,
  QrCode,
  Smartphone,
} from "lucide-react";

export function PaymentView({ itineraryId }: { itineraryId: string }) {
  const router = useRouter();
  const { show } = useToast();
  const [record, setRecord] = useState<ClientItineraryRecord | null>(null);
  const [snapshot, setSnapshot] = useState<ItinerarySnapshot | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const r = getClientItinerary(itineraryId);
    const revs = getRevisions(itineraryId);
    const current = revs.find((rev) => rev.id === r?.current_revision_id) ?? revs[0];
    if (r && current) {
      setRecord(r);
      setSnapshot(normalizeSnapshot(current.snapshot));
    }
  }, [itineraryId]);

  const themeShell = useMemo(
    () => themeShellClass(snapshot?.preview_theme),
    [snapshot?.preview_theme]
  );

  const advancePercent: AdvancePercent = clampAdvancePercent(snapshot?.advance_percent);
  const advanceRate = advanceRateFromPercent(advancePercent);

  const tierAdvances = useMemo(() => {
    if (!snapshot) return [];
    return snapshot.category_pricing.map((tier) => {
      const total = tier.grand_total > 0 ? tier.grand_total : tier.package_price;
      const amount = bookingAdvance(total, advanceRate);
      return { tier, total, amount };
    });
  }, [snapshot, advanceRate]);

  const primaryAdvance = tierAdvances[0]?.amount ?? 0;
  const primaryTotal = tierAdvances[0]?.total ?? snapshot?.final_price ?? 0;

  if (!record || !snapshot) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-stone-500">
        Loading payment…
      </div>
    );
  }

  function patchAdvance(percent: AdvancePercent) {
    setSnapshot((prev) => {
      if (!prev) return prev;
      const rate = advanceRateFromPercent(percent);
      return normalizeSnapshot({
        ...prev,
        advance_percent: percent,
        category_pricing: prev.category_pricing.map((t) => {
          const total = t.grand_total > 0 ? t.grand_total : t.package_price;
          return {
            ...t,
            booking_amount: bookingAdvance(total, rate),
          };
        }),
      });
    });
  }

  function handleSave() {
    if (!snapshot) return null;
    const result = saveSnapshotRevision(itineraryId, snapshot, {
      save_type: "manual",
      milestone_label: "Payment advance",
    });
    if (!result) {
      show("Failed to save");
      return null;
    }
    setRecord(result.record);
    setSnapshot(normalizeSnapshot(result.revision.snapshot));
    return result;
  }

  function handleRecordAdvance() {
    const saved = handleSave();
    if (!saved) return;
    const amount = primaryAdvance;
    const updated = updatePaymentStatus(
      itineraryId,
      amount >= primaryTotal && primaryTotal > 0 ? "paid" : "partial",
      amount
    );
    if (updated) setRecord(updated);
    show(`Advance of ${formatInr(amount)} recorded (${advancePercent}%)`);
  }

  async function copyText(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      show("Copied");
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      show("Could not copy");
    }
  }

  const bank = DUMMY_PAYMENT_DETAILS.bank;

  return (
    <div className={cn("min-h-screen", themeShell)}>
      <div className="sticky top-0 z-20 border-b border-[#7B1E2E]/15 bg-[#FBF7F0]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#7B1E2E]">
              Make Payment
            </p>
            <p className="font-semibold text-stone-900">
              {record.quote_id} · {snapshot.header.title}
            </p>
          </div>
          <Link
            href={`/itinerary-builder/${itineraryId}/preview-confirm`}
            className="text-sm font-medium text-stone-600 hover:text-stone-900"
          >
            Back to Preview
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <header className="text-center">
          <p className="font-serif text-3xl font-bold tracking-tight text-[#7B1E2E]">
            Complete Your Booking
          </p>
          <div className="mx-auto mt-3 h-px w-24 bg-gradient-to-r from-transparent via-[#A67C2D] to-transparent" />
          <p className="mt-3 text-sm text-stone-600">
            Pay the advance amount via bank transfer or UPI to confirm this package.
          </p>
        </header>

        {/* Advance % + amounts */}
        <section className="rounded-2xl border border-[#7B1E2E]/20 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
            <CreditCard className="h-5 w-5 text-[#7B1E2E]" />
            Advance Amount
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Admin &amp; agents can set 20% or 30% of the package total.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {([20, 30] as const).map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => patchAdvance(pct)}
                className={cn(
                  "rounded-xl border-2 px-5 py-2.5 text-sm font-semibold transition",
                  advancePercent === pct
                    ? "border-[#7B1E2E] bg-[#7B1E2E] text-white"
                    : "border-stone-200 bg-white text-stone-700 hover:border-[#A67C2D]"
                )}
              >
                {pct}% Advance
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            {tierAdvances.length === 0 ? (
              <p className="text-sm text-stone-500">No category pricing set on this itinerary.</p>
            ) : (
              tierAdvances.map(({ tier, total, amount }) => (
                <div
                  key={tier.category_key}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-100 bg-[#FBF7F0] px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-stone-900">{tier.label}</p>
                    <p className="text-xs text-stone-500">
                      Package total {formatInr(total)} · {advancePercent}% advance
                    </p>
                  </div>
                  <p className="text-xl font-bold tabular-nums text-[#7B1E2E]">
                    {formatInr(amount)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Bank details */}
        <section className="rounded-2xl border border-[#7B1E2E]/20 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
            <Building2 className="h-5 w-5 text-[#7B1E2E]" />
            Bank Details
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
              Dummy
            </span>
          </h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {(
              [
                ["Account Name", bank.account_name],
                ["Bank", bank.bank_name],
                ["Account Number", bank.account_number],
                ["IFSC", bank.ifsc],
                ["Branch", bank.branch],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-xl border border-stone-100 bg-stone-50/80 px-3 py-2">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  {label}
                </dt>
                <dd className="mt-0.5 flex items-center justify-between gap-2 font-medium text-stone-900">
                  <span className="break-all">{value}</span>
                  <button
                    type="button"
                    className="shrink-0 rounded p-1 text-stone-400 hover:bg-white hover:text-[#7B1E2E]"
                    onClick={() => void copyText(label, value)}
                    aria-label={`Copy ${label}`}
                  >
                    {copiedKey === label ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* UPI + QR */}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-[#7B1E2E]/20 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
              <Smartphone className="h-5 w-5 text-[#7B1E2E]" />
              UPI IDs
            </h2>
            <ul className="mt-4 space-y-2">
              {DUMMY_PAYMENT_DETAILS.upi_ids.map((upi) => (
                <li
                  key={upi}
                  className="flex items-center justify-between gap-2 rounded-xl border border-stone-100 bg-[#FBF7F0] px-4 py-3"
                >
                  <span className="font-mono text-sm font-medium text-stone-900">{upi}</span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-medium text-stone-600 hover:border-[#7B1E2E] hover:text-[#7B1E2E]"
                    onClick={() => void copyText(upi, upi)}
                  >
                    {copiedKey === upi ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    Copy
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-[#7B1E2E]/20 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
              <QrCode className="h-5 w-5 text-[#7B1E2E]" />
              Scan QR Code
            </h2>
            <div className="mt-4 flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={DUMMY_PAYMENT_DETAILS.qr_image_src}
                alt="Payment QR code placeholder"
                className="h-48 w-48 rounded-xl border border-stone-200 shadow-sm"
              />
              <p className="mt-3 text-center text-xs text-stone-500">
                Dummy QR — replace with live UPI QR later
              </p>
              <p className="mt-1 text-sm font-semibold text-[#7B1E2E]">
                Pay {formatInr(primaryAdvance)}
              </p>
            </div>
          </section>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#7B1E2E]/15 pb-10 pt-4">
          <button
            type="button"
            className="text-sm font-medium text-stone-600 hover:text-stone-900"
            onClick={() => router.push(`/itinerary-builder/${itineraryId}/preview-confirm`)}
          >
            Back to Preview
          </button>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-[#7B1E2E]/30 text-[#7B1E2E]"
              onClick={() => {
                if (handleSave()) show("Saved");
              }}
            >
              Save
            </Button>
            <Button
              type="button"
              className="bg-[#7B1E2E] hover:bg-[#5C0F1A]"
              onClick={handleRecordAdvance}
              disabled={primaryAdvance <= 0}
            >
              Record Advance Payment
            </Button>
          </div>
        </div>

        {record.payment_status !== "unpaid" && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-800">
            Payment status: <strong>{record.payment_status}</strong> · Amount paid:{" "}
            {formatInr(record.amount_paid)}
          </p>
        )}
      </div>
    </div>
  );
}
