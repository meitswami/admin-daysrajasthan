import type {
  CategoryPricingTier,
  CategoryTotalSummary,
  CostLineItem,
  CostSheet,
  ItineraryDay,
  ItinerarySnapshot,
} from "@/types/itinerary-builder";
import { newUuid } from "./defaults";

const HOTEL_RATES: Record<string, number> = {
  Standard: 3500,
  Deluxe: 5500,
  "Super Deluxe": 7500,
  Luxury: 12000,
  Heritage: 9500,
};

const VEHICLE_RATES: Record<string, number> = {
  Sedan: 3500,
  SUV: 4500,
  "Innova Crysta": 5500,
  "Tempo Traveller 12": 8500,
  "Tempo Traveller 17": 10500,
  "Mini Bus": 14000,
};

const MARKUP_PCT = 12;
const GST_PCT = 5;

export const PRICING_RATES = {
  markupPct: MARKUP_PCT,
  gstPct: GST_PCT,
  hotels: HOTEL_RATES,
  vehicles: VEHICLE_RATES,
  guidePerDay: 1500,
} as const;

export type PricingHint = {
  kind: "missing" | "active";
  day_number?: number;
  label: string;
  tab?: "hotel" | "transport" | "activities";
};

/** Why total is zero or what contributes — for UI hints */
export function getPricingHints(snapshot: ItinerarySnapshot): PricingHint[] {
  const hints: PricingHint[] = [];

  if (snapshot.days.length === 0) {
    hints.push({ kind: "missing", label: "Add at least one day in the left sidebar" });
    return hints;
  }

  for (const day of snapshot.days) {
    const hasHotel = Boolean(day.hotel_name && day.room_category);
    const hasVehicle = Boolean(day.vehicle_type);
    const hasGuide = day.guide_required;
    const hasActivities = day.activities.some((a) => a.entry_fee > 0);

    if (!hasHotel) {
      hints.push({
        kind: "missing",
        day_number: day.day_number,
        tab: "hotel",
        label: `Day ${day.day_number}: pick a hotel + room category`,
      });
    }
    if (!hasVehicle && !hasGuide && !hasActivities) {
      hints.push({
        kind: "missing",
        day_number: day.day_number,
        tab: "transport",
        label: `Day ${day.day_number}: add vehicle, guide, or activity fees`,
      });
    }
    if (hasHotel) {
      hints.push({
        kind: "active",
        day_number: day.day_number,
        label: `Day ${day.day_number}: hotel (${day.room_category}) × ${Math.max(1, snapshot.client.rooms)} room(s)`,
      });
    }
    if (hasVehicle) {
      hints.push({
        kind: "active",
        day_number: day.day_number,
        label: `Day ${day.day_number}: ${day.vehicle_type}`,
      });
    }
  }

  return hints;
}

export function countBillableInputs(snapshot: ItinerarySnapshot): {
  hotelNights: number;
  vehicleDays: number;
  guideDays: number;
  activityLines: number;
} {
  let hotelNights = 0;
  let vehicleDays = 0;
  let guideDays = 0;
  let activityLines = 0;

  for (const day of snapshot.days) {
    if (day.hotel_name && day.room_category) hotelNights += 1;
    if (day.vehicle_type) vehicleDays += 1;
    if (day.guide_required) guideDays += 1;
    activityLines += day.activities.filter((a) => a.entry_fee > 0).length;
  }

  return { hotelNights, vehicleDays, guideDays, activityLines };
}

function line(
  day: number | null,
  category: CostLineItem["category"],
  description: string,
  quantity: number,
  unit: number
): CostLineItem {
  return {
    id: newUuid(),
    day_number: day,
    category,
    description,
    quantity,
    unit_cost: unit,
    total: Math.round(quantity * unit),
  };
}

export function buildCostLineItems(snapshot: ItinerarySnapshot): CostLineItem[] {
  const items: CostLineItem[] = [];
  const rooms = Math.max(1, snapshot.client?.rooms ?? 1);

  for (const day of snapshot.days ?? []) {
    if (day.hotel_name && day.room_category) {
      const rate = HOTEL_RATES[day.room_category] ?? 5000;
      items.push(
        line(day.day_number, "hotel", `${day.hotel_name} — ${day.room_category}`, rooms, rate)
      );
    }
    if (day.vehicle_type) {
      const rate = VEHICLE_RATES[day.vehicle_type] ?? 4000;
      items.push(line(day.day_number, "vehicle", day.vehicle_type, 1, rate));
    }
    if (day.guide_required) {
      items.push(line(day.day_number, "guide", "Local guide", 1, 1500));
    }
    for (const act of day.activities ?? []) {
      if (act.entry_fee > 0) {
        const pax = (snapshot.client?.adults ?? 0) + (snapshot.client?.children_5_12 ?? 0);
        items.push(
          line(day.day_number, "activity", act.title || "Activity entry", Math.max(1, pax), act.entry_fee)
        );
      }
    }
  }

  return items;
}

export function calculateCostSheet(snapshot: ItinerarySnapshot): CostSheet {
  const line_items = buildCostLineItems(snapshot);
  const subtotal = line_items.reduce((s, i) => s + i.total, 0);
  const markup_total = Math.round(subtotal * (MARKUP_PCT / 100));
  const pre_tax = subtotal + markup_total;
  const tax_total = Math.round(pre_tax * (GST_PCT / 100));
  const grand_total = pre_tax + tax_total;
  const direct_cost = subtotal;
  const net_profit = grand_total - direct_cost - tax_total;
  const margin_pct = grand_total > 0 ? Math.round((net_profit / grand_total) * 1000) / 10 : 0;

  return {
    currency: "INR",
    line_items: [
      ...line_items,
      line(null, "markup", `Agency markup (${MARKUP_PCT}%)`, 1, markup_total),
      line(null, "tax", `GST (${GST_PCT}%)`, 1, tax_total),
    ],
    subtotal,
    markup_total,
    discount_total: 0,
    tax_total,
    grand_total,
    net_profit,
    margin_pct,
  };
}

export function buildCostLineItemsForRoomCategory(
  snapshot: ItinerarySnapshot,
  roomCategoryOverride: string
): CostLineItem[] {
  const adjusted = {
    ...snapshot,
    days: (snapshot.days ?? []).map((d) => ({
      ...d,
      room_category: d.hotel_name ? roomCategoryOverride : d.room_category,
    })),
  };
  return buildCostLineItems(adjusted);
}

export function categoryTotalsFromSnapshot(snapshot: ItinerarySnapshot): CategoryTotalSummary[] {
  return (snapshot.category_pricing ?? []).map((t) => ({
    category_key: t.category_key,
    label: t.label,
    grand_total: t.manual_override ?? t.grand_total,
  }));
}

export function primaryGrandTotal(snapshot: ItinerarySnapshot): number {
  const tiers = snapshot.category_pricing ?? [];
  if (tiers.length > 0) {
    return Math.max(...tiers.map((t) => t.manual_override ?? t.grand_total));
  }
  return snapshot.cost_sheet?.grand_total ?? 0;
}

export function recalculateCategoryPricing(snapshot: ItinerarySnapshot): CategoryPricingTier[] {
  return (snapshot.category_pricing ?? []).map((tier) => {
    const priced = calculateCostSheet({
      ...snapshot,
      days: (snapshot.days ?? []).map((d) => ({
        ...d,
        room_category: d.hotel_name ? tier.room_category : d.room_category,
      })),
    });
    const package_price = priced.grand_total;
    const discount = tier.discount_price;
    const grand_total =
      tier.manual_override != null
        ? tier.manual_override
        : discount != null && discount > 0
          ? discount
          : package_price;
    return {
      ...tier,
      package_price,
      grand_total,
    };
  });
}

export function applyCostToSnapshot(snapshot: ItinerarySnapshot): ItinerarySnapshot {
  const tiers = snapshot.category_pricing ?? [];
  const category_pricing =
    tiers.length > 0 ? recalculateCategoryPricing({ ...snapshot, category_pricing: tiers }) : [];
  const cost_sheet = calculateCostSheet({ ...snapshot, category_pricing: tiers });
  if (category_pricing.length > 0) {
    const maxTotal = Math.max(...category_pricing.map((t) => t.grand_total));
    return {
      ...snapshot,
      category_pricing,
      cost_sheet: { ...cost_sheet, grand_total: maxTotal },
    };
  }
  return {
    ...snapshot,
    category_pricing,
    cost_sheet,
  };
}

export function durationLabelFromDays(days: ItineraryDay[]): string {
  const n = days?.length ?? 0;
  if (n <= 0) return "";
  const nights = Math.max(0, n - 1);
  return `${nights} Night${nights !== 1 ? "s" : ""} / ${n} Day${n !== 1 ? "s" : ""}`;
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
