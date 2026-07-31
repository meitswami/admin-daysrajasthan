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
const BOOKING_ADVANCE_RATE = 0.2;

export function advanceRateFromPercent(percent: 20 | 30 | undefined | null): number {
  return (percent === 30 ? 30 : 20) / 100;
}

/** Normalize UI vehicle labels to rate-card keys */
export function normalizeVehicleType(vehicleType: string): string {
  const v = vehicleType.trim();
  if (/tempo\s*traveller\s*17/i.test(v)) return "Tempo Traveller 17";
  if (/tempo\s*traveller/i.test(v)) return "Tempo Traveller 12";
  if (/innova/i.test(v)) return "Innova Crysta";
  if (/mini\s*bus/i.test(v)) return "Mini Bus";
  if (/\bsuv\b/i.test(v)) return "SUV";
  if (/sedan/i.test(v)) return "Sedan";
  return v;
}

export function vehicleRate(vehicleType: string): number {
  return VEHICLE_RATES[normalizeVehicleType(vehicleType)] ?? 4000;
}

/** Advance used across builder + quotation (default 20%) */
export function bookingAdvance(total: number, rate = BOOKING_ADVANCE_RATE): number {
  return Math.round(total * rate);
}

/**
 * Final package total after discount amount.
 * Formula: max(0, (manual override || package price) - discount)
 */
export function resolveCategoryTierPricing(
  tier: {
    package_price: number;
    discount_price: number | null;
    manual_override: number | null;
  },
  advanceRate = BOOKING_ADVANCE_RATE
): { base_price: number; grand_total: number; booking_amount: number | null } {
  const base_price =
    tier.manual_override != null && tier.manual_override > 0
      ? tier.manual_override
      : Math.max(0, tier.package_price);
  const discount =
    tier.discount_price != null && tier.discount_price > 0 ? tier.discount_price : 0;
  const grand_total = Math.max(0, Math.round(base_price - Math.min(discount, base_price)));
  return {
    base_price,
    grand_total,
    // Keep empty until there is a real final price (avoid sticky "0" in the form).
    booking_amount: grand_total > 0 ? bookingAdvance(grand_total, advanceRate) : null,
  };
}

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
        label: `Day ${day.day_number}: hotel (${day.room_category}) × ${Math.max(1, snapshot.client.rooms ?? 0)} room(s)`,
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
      const rate = vehicleRate(day.vehicle_type);
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
    grand_total: t.grand_total,
  }));
}

export function primaryGrandTotal(snapshot: ItinerarySnapshot): number {
  const tiers = snapshot.category_pricing ?? [];
  if (tiers.length > 0) {
    return Math.max(...tiers.map((t) => t.grand_total));
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
    const { grand_total, booking_amount } = resolveCategoryTierPricing({
      package_price,
      discount_price: tier.discount_price,
      manual_override: tier.manual_override,
    });
    return {
      ...tier,
      package_price,
      grand_total,
      booking_amount,
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
      final_price: category_pricing[0]?.grand_total ?? snapshot.final_price,
      cost_sheet: {
        ...cost_sheet,
        discount_total: category_pricing.reduce(
          (sum, t) => sum + Math.max(0, t.discount_price ?? 0),
          0
        ),
        grand_total: maxTotal,
      },
    };
  }
  return {
    ...snapshot,
    category_pricing,
    cost_sheet,
  };
}

/** Min itinerary length (02 Days / 01 Night with last day Departure). */
export const MIN_ITINERARY_DAYS = 2;

/** Max itinerary length staff can drive from the Duration field. */
export const MAX_ITINERARY_DAYS = 60;

export function isDepartureLocation(location: string | null | undefined): boolean {
  return (location ?? "").trim().toLowerCase() === "departure";
}

/** Last itinerary day must be Departure (drops the final overnight). */
export function lastDayDepartureError(days: ItineraryDay[]): string | null {
  if (!days?.length) return null;
  if (isDepartureLocation(days[days.length - 1]?.location)) return null;
  return 'The last day must have Location set to "Departure"';
}

/** Hotel nights: one per day, minus the last day when it is Departure. */
export function nightCountFromDays(days: ItineraryDay[]): number {
  const n = days?.length ?? 0;
  if (n <= 0) return 0;
  if (isDepartureLocation(days[n - 1]?.location)) return Math.max(0, n - 1);
  return n;
}

/** Days that get a Night / hotel block on the right column. */
export function hotelBlockDaysFromItinerary(days: ItineraryDay[]): ItineraryDay[] {
  if (!days?.length) return [];
  if (isDepartureLocation(days[days.length - 1]?.location)) {
    return days.slice(0, -1);
  }
  return days;
}

/** Format as `03 Days / 02 Nights` (defaults to days − 1 nights when nights omitted). */
export function durationLabelFromDayCount(dayCount: number, nightCount?: number): string {
  const n = Math.max(0, Math.floor(dayCount));
  if (n <= 0) return "";
  const nights =
    nightCount != null && Number.isFinite(nightCount)
      ? Math.max(0, Math.floor(nightCount))
      : Math.max(0, n - 1);
  const dd = String(n).padStart(2, "0");
  const nn = String(nights).padStart(2, "0");
  return `${dd} Day${n !== 1 ? "s" : ""} / ${nn} Night${nights !== 1 ? "s" : ""}`;
}

export function durationLabelFromDays(days: ItineraryDay[]): string {
  const dayCount = days?.length ?? 0;
  return durationLabelFromDayCount(dayCount, nightCountFromDays(days ?? []));
}

/**
 * Interpret Duration box typing: `03`, `3`, `30`, or full labels like
 * `03 Days / 02 Nights` / legacy `2 Nights / 3 Days`.
 * Partial digit input (`3`) is treated as that many days until more digits arrive.
 */
export function parseDayCountFromDurationInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const daysMatch = trimmed.match(/(\d+)\s*Days?/i);
  if (daysMatch) {
    const n = Number(daysMatch[1]);
    return Number.isFinite(n) ? n : null;
  }

  if (/^\d{1,3}$/.test(trimmed)) {
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }

  const nightsFirst = trimmed.match(/^(\d+)\s*Nights?/i);
  if (nightsFirst) {
    const n = Number(nightsFirst[1]) + 1;
    return Number.isFinite(n) ? n : null;
  }

  const leading = trimmed.match(/^(\d{1,3})\b/);
  if (leading) {
    const n = Number(leading[1]);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

/**
 * Resize day list to `targetCount`, restoring previously trimmed days from
 * `cache` (by index) so accidental Duration edits do not lose staff work.
 */
export function resizeDaysPreservingCache(
  current: ItineraryDay[],
  targetCount: number,
  cache: ItineraryDay[],
  createEmpty: (dayNumber: number) => ItineraryDay
): { days: ItineraryDay[]; cache: ItineraryDay[] } {
  const target = Math.max(
    MIN_ITINERARY_DAYS,
    Math.min(MAX_ITINERARY_DAYS, Math.floor(targetCount))
  );
  const nextCache = cache.slice();
  current.forEach((day, i) => {
    nextCache[i] = day;
  });

  const days: ItineraryDay[] = [];
  for (let i = 0; i < target; i++) {
    const fromCurrent = current[i];
    const fromCache = nextCache[i];
    if (fromCurrent) {
      days.push({ ...fromCurrent, day_number: i + 1 });
    } else if (fromCache) {
      days.push({ ...fromCache, day_number: i + 1 });
    } else {
      const empty = createEmpty(i + 1);
      days.push(empty);
      nextCache[i] = empty;
    }
  }

  // Only the final day is Departure (drives 02 Days / 01 Night style labels).
  for (let i = 0; i < days.length; i++) {
    const isLast = i === days.length - 1;
    if (isLast && !isDepartureLocation(days[i].location)) {
      days[i] = { ...days[i], location: "Departure" };
      nextCache[i] = days[i];
    } else if (!isLast && isDepartureLocation(days[i].location)) {
      days[i] = { ...days[i], location: null };
      nextCache[i] = days[i];
    }
  }

  return { days, cache: nextCache };
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
