import type { CategoryPricingTier, ItineraryDay } from "@/types/itinerary-builder";
import { formatDate } from "@/lib/utils";
import { bookingAdvance } from "./cost-engine";

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
    .replace(/\b(the|arrival|departure|from|to)\b/gi, "")
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

export function formatDestinationsSummary(segments: NightSegment[]): string {
  return segments.map((s) => `${s.destination} · ${s.nights}N`).join(" • ");
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
