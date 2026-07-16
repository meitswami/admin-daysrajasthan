/**
 * Deterministic pricing service.
 * AI must NEVER call this as a write source of truth for inventing prices —
 * quotation/service always prices snapshots here before persistence.
 */

import {
  applyCostToSnapshot,
  calculateCostSheet,
  primaryGrandTotal,
  PRICING_RATES,
} from "@/lib/itinerary-builder/cost-engine";
import type { ItinerarySnapshot } from "@/types/itinerary-builder";

import type { QuotationPriceLine, QuotationPricingSummary, QuotationSnapshot } from "../types";

export type PricingAdjustmentInput = {
  /** Future: percent or absolute discount */
  discountTotal?: number;
  /** Future: coupon absolute amount */
  couponTotal?: number;
  /** Future: promotion absolute amount */
  promotionTotal?: number;
  /** Future: hotel upgrade delta */
  upgradeTotal?: number;
  /** Future: seasonal delta */
  seasonalTotal?: number;
};

/**
 * Apply deterministic cost engine to a snapshot (source of truth for totals).
 */
export function priceSnapshot(snapshot: QuotationSnapshot): QuotationSnapshot {
  return applyCostToSnapshot(snapshot);
}

/**
 * Build pricing summary DTO from a snapshot. Does not invent figures.
 */
export function summarizePricing(
  snapshot: QuotationSnapshot,
  adjustments: PricingAdjustmentInput = {}
): QuotationPricingSummary {
  const sheet = snapshot.cost_sheet ?? calculateCostSheet(snapshot);
  const discountTotal = adjustments.discountTotal ?? sheet.discount_total ?? 0;
  const couponTotal = adjustments.couponTotal ?? 0;
  const promotionTotal = adjustments.promotionTotal ?? 0;
  const upgradeTotal = adjustments.upgradeTotal ?? 0;
  const seasonalTotal = adjustments.seasonalTotal ?? 0;

  const adjustmentSum =
    upgradeTotal + seasonalTotal - discountTotal - couponTotal - promotionTotal;
  const grandTotal = Math.max(0, Math.round(primaryGrandTotal(snapshot) + adjustmentSum));

  return {
    currency: sheet.currency || "INR",
    subtotal: sheet.subtotal,
    markupTotal: sheet.markup_total,
    discountTotal,
    taxTotal: sheet.tax_total,
    grandTotal,
    marginPct: sheet.margin_pct,
    adjustments: {
      taxes: sheet.tax_total,
      discounts: discountTotal,
      coupons: couponTotal,
      promotions: promotionTotal,
      upgrades: upgradeTotal,
      seasonal: seasonalTotal,
    },
  };
}

/**
 * Flatten cost sheet lines for Renderer / portals.
 */
export function listPriceLines(snapshot: QuotationSnapshot): QuotationPriceLine[] {
  const sheet = snapshot.cost_sheet ?? calculateCostSheet(snapshot);
  return sheet.line_items.map((line) => ({
    id: line.id,
    category: line.category,
    description: line.description,
    quantity: line.quantity,
    unitCost: line.unit_cost,
    total: line.total,
    dayNumber: line.day_number,
  }));
}

/**
 * Expose current deterministic rate card (for explainability — not for AI mutation).
 */
export function getPricingRateCard() {
  return PRICING_RATES;
}

/**
 * Type guard helper for tests / callers passing unknown snapshots.
 */
export function asQuotationSnapshot(value: ItinerarySnapshot): QuotationSnapshot {
  return value;
}
