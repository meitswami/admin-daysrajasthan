"use client";

import {
  countBillableInputs,
  formatInr,
  getPricingHints,
  PRICING_RATES,
} from "@/lib/itinerary-builder/cost-engine";
import type { CostSheet, ItinerarySnapshot } from "@/types/itinerary-builder";
import { cn } from "@/lib/utils";
import { Calculator, Info } from "lucide-react";

export function CostSheetPanel({
  costSheet,
  snapshot,
  onGoToDay,
}: {
  costSheet: CostSheet;
  snapshot: ItinerarySnapshot;
  onGoToDay?: (dayIndex: number) => void;
}) {
  const hints = getPricingHints(snapshot);
  const missing = hints.filter((h) => h.kind === "missing");
  const counts = countBillableInputs(snapshot);
  const isEmpty = costSheet.grand_total === 0;
  const directItems = costSheet.line_items.filter(
    (l) => l.category !== "markup" && l.category !== "tax"
  );

  return (
    <div className="flex h-full flex-col p-4">
      <div className="flex items-start gap-2">
        <Calculator className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div>
          <h3 className="text-sm font-semibold text-stone-900">Live pricing</h3>
          <p className="text-xs leading-relaxed text-stone-500">
            Auto-calculated from each day&apos;s{" "}
            <strong className="font-medium text-stone-700">Hotel</strong>,{" "}
            <strong className="font-medium text-stone-700">Transport</strong>, and{" "}
            <strong className="font-medium text-stone-700">Activities</strong> tabs.
          </p>
        </div>
      </div>

      {isEmpty && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/90 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
            <Info className="h-3.5 w-3.5" />
            Why is the total ₹0?
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-amber-950/80">
            Nothing is billable yet. Assign a <em>hotel + room type</em> and/or{" "}
            <em>vehicle</em> on each day — rates come from the built-in demo rate card below.
          </p>
          {missing.length > 0 && (
            <ul className="mt-2 space-y-1">
              {missing.slice(0, 4).map((h) => (
                <li key={h.label}>
                  {h.day_number != null && onGoToDay ? (
                    <button
                      type="button"
                      onClick={() => onGoToDay(h.day_number! - 1)}
                      className="text-left text-xs text-amber-800 underline-offset-2 hover:underline"
                    >
                      → {h.label}
                    </button>
                  ) : (
                    <span className="text-xs text-amber-800">→ {h.label}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!isEmpty && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-stone-600">
          <span className="rounded-md bg-stone-50 px-2 py-1">
            🏨 {counts.hotelNights} hotel night(s)
          </span>
          <span className="rounded-md bg-stone-50 px-2 py-1">
            🚗 {counts.vehicleDays} vehicle day(s)
          </span>
          <span className="rounded-md bg-stone-50 px-2 py-1">
            👤 {counts.guideDays} guide day(s)
          </span>
          <span className="rounded-md bg-stone-50 px-2 py-1">
            🎫 {counts.activityLines} activity fee(s)
          </span>
        </div>
      )}

      <ul className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto text-xs">
        {directItems.length === 0 ? (
          <li className="text-stone-400 italic">Line items appear when days have costs</li>
        ) : (
          directItems.map((line) => (
            <li key={line.id} className="flex justify-between gap-2 border-b border-stone-50 pb-2">
              <span className="text-stone-600">
                {line.day_number ? `Day ${line.day_number} · ` : ""}
                {line.description}
              </span>
              <span className="shrink-0 tabular-nums font-medium text-stone-800">
                {formatInr(line.total)}
              </span>
            </li>
          ))
        )}
        {!isEmpty && (
          <>
            <li className="flex justify-between gap-2 pt-1 text-stone-500">
              <span>Agency markup ({PRICING_RATES.markupPct}%)</span>
              <span>{formatInr(costSheet.markup_total)}</span>
            </li>
            <li className="flex justify-between gap-2 text-stone-500">
              <span>GST ({PRICING_RATES.gstPct}%)</span>
              <span>{formatInr(costSheet.tax_total)}</span>
            </li>
          </>
        )}
      </ul>

      <details className="mt-3 rounded-lg border border-stone-100 bg-stone-50/80 text-[10px] text-stone-600">
        <summary className="cursor-pointer px-2 py-1.5 font-medium text-stone-700">
          Demo rate card (per night / per day)
        </summary>
        <div className="space-y-2 border-t border-stone-100 px-2 py-2">
          <p>
            <strong>Hotels:</strong> Deluxe ₹5,500 · Super Deluxe ₹7,500 · Luxury ₹12,000
          </p>
          <p>
            <strong>Vehicles:</strong> SUV ₹4,500 · Innova ₹5,500 · Tempo 12 ₹8,500
          </p>
          <p>
            <strong>Guide:</strong> ₹1,500/day · <strong>Activities:</strong> entry fee × pax
          </p>
          <p className="text-stone-500">
            Formula: subtotal + {PRICING_RATES.markupPct}% markup + {PRICING_RATES.gstPct}% GST
          </p>
        </div>
      </details>
    </div>
  );
}

export function CostSummaryBar({
  costSheet,
  version,
  snapshot,
  className,
}: {
  costSheet: CostSheet;
  version: number;
  snapshot?: ItinerarySnapshot;
  className?: string;
}) {
  const isEmpty = costSheet.grand_total === 0;
  const missingCount = snapshot
    ? getPricingHints(snapshot).filter((h) => h.kind === "missing").length
    : 0;

  return (
    <div
      className={cn(
        "border-t border-stone-200 bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.04)]",
        className
      )}
    >
      {isEmpty && snapshot && (
        <div className="border-b border-amber-100 bg-amber-50/80 px-4 py-2 text-center text-xs text-amber-900">
          <strong>Pricing is ₹0</strong> — add hotel &amp; vehicle on each day (right panel shows what&apos;s
          missing{missingCount > 0 ? `: ${missingCount} item(s)` : ""})
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="text-stone-500" title="Saved revision number">
            Quote v<span className="font-semibold text-stone-800">{version}</span>
          </span>
          <span className="hidden sm:inline text-stone-300">|</span>
          <span title="Hotel + vehicle + guide + activities (before markup)">
            Direct costs{" "}
            <strong className="text-stone-800">{formatInr(costSheet.subtotal)}</strong>
          </span>
          <span title={`${PRICING_RATES.gstPct}% on subtotal + markup`}>
            + GST{" "}
            <strong className="text-stone-800">{formatInr(costSheet.tax_total)}</strong>
          </span>
          {!isEmpty && (
            <span title="Profit after direct costs and tax">
              Margin{" "}
              <strong
                className={cn(
                  costSheet.margin_pct >= 15 ? "text-emerald-700" : "text-amber-700"
                )}
              >
                {costSheet.margin_pct}%
              </strong>
            </span>
          )}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-medium uppercase tracking-wide text-stone-500">
            Client grand total
          </p>
          <p
            className={cn(
              "text-xl font-bold tabular-nums",
              isEmpty ? "text-stone-400" : "text-amber-900"
            )}
          >
            {formatInr(costSheet.grand_total)}
          </p>
        </div>
      </div>
    </div>
  );
}
