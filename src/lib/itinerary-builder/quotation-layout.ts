import type {
  CategoryPricingTier,
  HotelCategoryKey,
  ItineraryDay,
} from "@/types/itinerary-builder";
import { formatDate } from "@/lib/utils";
import { bookingAdvance } from "./cost-engine";
import { dayViewForCategory } from "./category-hotels";

export type NightSegment = {
  nightLabel: string;
  destination: string;
  nights: number;
  startDay: number;
  endDay: number;
  dateLabel: string;
};

export type HotelStay = {
  hotelName: string;
  destination: string;
  roomCategory: string;
  checkIn: string | null;
  checkOut: string | null;
  breakfast: boolean;
  rating: number;
  reviewCount: number;
};

export function bookingAmount(total: number, rate?: number): number {
  return bookingAdvance(total, rate);
}

export function extractDestination(day: ItineraryDay): string {
  const source = day.day_subtitle?.trim() || day.day_title.trim();
  const beforeDash = source.split(" - ")[0]?.trim();
  const beforeComma = beforeDash.split(",")[0]?.trim();
  const cleaned = (beforeComma || source)
    .replace(/\b(the|arrival|departure|from|to|in)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return `Day ${day.day_number}`;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function dayDate(travelDate: string | null, dayNumber: number): Date | null {
  if (!travelDate) return null;
  const base = new Date(travelDate);
  if (Number.isNaN(base.getTime())) return null;
  base.setDate(base.getDate() + dayNumber - 1);
  return base;
}

function formatNightDateRange(
  travelDate: string | null,
  startDay: number,
  endDay: number,
  nights: number
): string {
  const start = dayDate(travelDate, startDay);
  const end = dayDate(travelDate, endDay);
  if (!start || !end) {
    return nights === 1 ? `Night ${String(startDay).padStart(2, "0")}` : `Night ${String(startDay).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
  }
  const nightText = nights === 1 ? "01 Night" : `${String(nights).padStart(2, "0")} Nights`;
  return `${formatDate(start)}${nights > 1 ? ` to ${formatDate(end)}` : ""} · ${nightText}`;
}

export function buildNightSegments(
  days: ItineraryDay[],
  travelDate: string | null
): NightSegment[] {
  const segments: NightSegment[] = [];
  let current: NightSegment | null = null;

  for (const day of days) {
    if (!day.hotel_name) {
      if (current) {
        segments.push(current);
        current = null;
      }
      continue;
    }

    const destination = extractDestination(day);

    if (current && current.destination === destination) {
      current.nights += 1;
      current.endDay = day.day_number;
      current.nightLabel =
        current.nights === 1
          ? `Night ${String(current.startDay).padStart(2, "0")}`
          : `Night ${String(current.startDay).padStart(2, "0")}-${String(current.endDay).padStart(2, "0")}`;
      current.dateLabel = formatNightDateRange(travelDate, current.startDay, current.endDay, current.nights);
      continue;
    }

    if (current) segments.push(current);
    current = {
      nightLabel: `Night ${String(day.day_number).padStart(2, "0")}`,
      destination,
      nights: 1,
      startDay: day.day_number,
      endDay: day.day_number,
      dateLabel: formatNightDateRange(travelDate, day.day_number, day.day_number, 1),
    };
  }

  if (current) segments.push(current);
  return segments;
}

/** Unique destinations as a simple path: `Udaipur -> Jaipur -> Jodhpur` */
export function formatDestinationsSummary(segments: NightSegment[]): string {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const s of segments) {
    const key = s.destination.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    names.push(s.destination.trim());
  }
  return names.join(" -> ");
}

export type CoveringDestination = {
  destination: string;
  nights: number;
  /** Theme 2 / SenduserviewData3 format: `Jaipur -2N` */
  label: string;
};

/** Aggregate nights per destination in visit order: Jaipur -2N, Jodhpur -2N, … */
export function formatCoveringDestinations(segments: NightSegment[]): CoveringDestination[] {
  const order: string[] = [];
  const totals = new Map<string, { destination: string; nights: number }>();
  for (const s of segments) {
    const name = s.destination.trim();
    const key = name.toLowerCase();
    if (!key) continue;
    if (!totals.has(key)) {
      order.push(key);
      totals.set(key, { destination: name, nights: 0 });
    }
    totals.get(key)!.nights += s.nights;
  }
  return order.map((key) => {
    const row = totals.get(key)!;
    return {
      destination: row.destination,
      nights: row.nights,
      label: `${row.destination} -${row.nights}N`,
    };
  });
}

/** Booking-level vehicles, falling back to unique per-day vehicle types. */
export function resolvePackageVehicles(input: {
  vehicle_types?: string[] | null;
  vehicle_type?: string | null;
  days?: { vehicle_type?: string | null }[];
}): string[] {
  const fromList = (input.vehicle_types ?? []).map((v) => v.trim()).filter(Boolean);
  if (fromList.length) return Array.from(new Set(fromList));
  if (input.vehicle_type?.trim()) return [input.vehicle_type.trim()];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const day of input.days ?? []) {
    const v = day.vehicle_type?.trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

export type HotelPackageOption = {
  hotelName: string;
  /** Original option label for master-catalog lookup */
  optionLabel: string;
  rating: number;
  reviewCount: number;
  breakfast: boolean;
  imageUrl?: string | null;
};

export type HotelPackageNight = {
  nightLabel: string;
  dateLabel: string;
  destination: string;
  checkIn: string | null;
  checkOut: string | null;
  options: HotelPackageOption[];
};

/** Night-grouped hotel cards for Theme 2 (OR layout from breakfast hotel pair). */
export function buildHotelPackageNights(
  days: ItineraryDay[],
  travelDate: string | null,
  opts?: {
    categoryKey?: HotelCategoryKey;
    roomCategory?: string | null;
    primaryKey?: HotelCategoryKey | null;
  }
): HotelPackageNight[] {
  const segments = buildNightSegments(days, travelDate);
  return segments.map((segment) => {
    const rawDay =
      days.find((d) => d.day_number === segment.startDay) ??
      days.find((d) => d.day_number >= segment.startDay && d.day_number <= segment.endDay);
    const day =
      rawDay && opts?.categoryKey
        ? dayViewForCategory(
            rawDay,
            opts.categoryKey,
            opts.roomCategory ?? null,
            opts.primaryKey ?? opts.categoryKey
          )
        : rawDay;
    const pair = day
      ? [day.breakfast_hotels?.[0], day.breakfast_hotels?.[1]].filter(Boolean)
      : [];
    const names =
      pair.length > 0
        ? (pair as string[])
        : day?.hotel_name
          ? [day.hotel_name]
          : [];
    const uniqueNames = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));
    const checkIn = dayDate(travelDate, segment.startDay);
    const checkOut = dayDate(travelDate, segment.endDay + 1);
    return {
      nightLabel: segment.nightLabel,
      dateLabel: segment.dateLabel,
      destination: segment.destination,
      checkIn: checkIn ? formatDate(checkIn) : null,
      checkOut: checkOut ? formatDate(checkOut) : null,
      options: uniqueNames.map((hotelName) => {
        const displayName = hotelName.split(" - ")[0]?.trim() || hotelName;
        const { rating, reviewCount } = displayHotelRating(displayName);
        return {
          hotelName: displayName,
          optionLabel: hotelName,
          rating,
          reviewCount,
          breakfast: Boolean(day?.breakfast || day?.breakfast_hotels?.includes(hotelName)),
        };
      }),
    };
  });
}

export function displayHotelRating(hotelName: string): { rating: number; reviewCount: number } {
  let hash = 0;
  for (const char of hotelName) hash = (hash + char.charCodeAt(0) * 17) | 0;
  const rating = Math.round((3.8 + (Math.abs(hash) % 12) / 10) * 10) / 10;
  const reviewCount = 40 + (Math.abs(hash) % 2800);
  return { rating, reviewCount };
}

export function getHotelStaysForTier(
  days: ItineraryDay[],
  roomCategory: string,
  travelDate: string | null
): HotelStay[] {
  const stays: HotelStay[] = [];
  let current: HotelStay | null = null;
  let startDay = 0;
  let endDay = 0;

  for (const day of days) {
    if (!day.hotel_name) {
      if (current) {
        stays.push(finalizeStay(current, travelDate, startDay, endDay));
        current = null;
      }
      continue;
    }

    const destination = extractDestination(day);
    if (current && current.hotelName === day.hotel_name) {
      endDay = day.day_number;
      current.breakfast = current.breakfast || day.breakfast;
      continue;
    }

    if (current) stays.push(finalizeStay(current, travelDate, startDay, endDay));

    const { rating, reviewCount } = displayHotelRating(day.hotel_name);
    startDay = day.day_number;
    endDay = day.day_number;
    current = {
      hotelName: day.hotel_name,
      destination,
      roomCategory,
      checkIn: null,
      checkOut: null,
      breakfast: day.breakfast,
      rating,
      reviewCount,
    };
  }

  if (current) stays.push(finalizeStay(current, travelDate, startDay, endDay));
  return stays;
}

function finalizeStay(
  stay: HotelStay,
  travelDate: string | null,
  startDay: number,
  endDay: number
): HotelStay {
  const checkIn = dayDate(travelDate, startDay);
  const checkOut = dayDate(travelDate, endDay + 1);
  return {
    ...stay,
    checkIn: checkIn ? formatDate(checkIn) : null,
    checkOut: checkOut ? formatDate(checkOut) : null,
  };
}

export function tierRowsFromSnapshot(
  categoryTotals: { category_key: string; label: string; grand_total: number }[],
  categoryPricing: CategoryPricingTier[]
) {
  if (categoryTotals.length > 0) {
    return categoryTotals.map((tier) => {
      const pricing = categoryPricing.find((p) => p.category_key === tier.category_key);
      return {
        ...tier,
        package_price: pricing?.package_price ?? tier.grand_total,
        room_category: pricing?.room_category ?? tier.label,
      };
    });
  }
  return categoryPricing.map((tier) => ({
    category_key: tier.category_key,
    label: tier.label,
    grand_total: tier.grand_total,
    package_price: tier.package_price,
    room_category: tier.room_category,
  }));
}

export const DEFAULT_CANCELLATION_POLICY =
  "Cancellation charges apply as per supplier rules and proximity to travel date. Our team will confirm applicable fees before processing any cancellation request.";

export const DEFAULT_PAYMENT_POLICY =
  "20% or 30% booking amount (as decided by admin/agent) to reserve. Balance due 7 days before departure. Payments accepted via bank transfer, UPI, and approved payment gateways.";
