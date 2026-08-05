import type {
  ClientItineraryRecord,
  DayCategoryHotelPicks,
  HotelCategoryKey,
  ItineraryDay,
  ItineraryRevision,
  ItinerarySnapshot,
} from "@/types/itinerary-builder";
import {
  clearPlaceholderDayTitles,
  emptyCostSheet,
  emptyCustomItineraryDays,
} from "@/lib/itinerary-builder/defaults";
import { normalizeCategoryHotelPicks } from "@/lib/itinerary-builder/category-hotels";
import { stringsToContentBlocks } from "@/lib/itinerary-builder/policy-master";
import { clampAdvancePercent } from "@/lib/itinerary-builder/payment-details";
import { clampPreviewTheme } from "@/lib/itinerary-builder/preview-themes";

function mealHotelPair(
  value: [string | null, string | null] | string[] | null | undefined,
  fallbackHotel: string | null
): [string | null, string | null] {
  if (Array.isArray(value)) {
    // Preserve explicit empty pairs — do not invent hotels from fallback.
    if (value.length === 0) return [null, null];
    return [value[0] ?? null, value[1] ?? null];
  }
  return [fallbackHotel, null];
}

function normalizeCategoryHotelPicksMap(
  value: ItineraryDay["category_hotel_picks"] | null | undefined
): Partial<Record<HotelCategoryKey, DayCategoryHotelPicks>> {
  if (!value || typeof value !== "object") return {};
  const out: Partial<Record<HotelCategoryKey, DayCategoryHotelPicks>> = {};
  for (const [key, picks] of Object.entries(value)) {
    out[key as HotelCategoryKey] = normalizeCategoryHotelPicks(picks);
  }
  return out;
}

function normalizeDay(day: ItineraryDay, index: number): ItineraryDay {
  return {
    ...day,
    day_number: day.day_number ?? index + 1,
    day_title: day.day_title ?? "",
    alternate_day_titles: day.alternate_day_titles ?? [],
    day_subtitle: day.day_subtitle ?? null,
    day_theme: day.day_theme ?? null,
    day_description: day.day_description ?? "",
    location: day.location ?? day.pickup_location ?? null,
    activities: day.activities ?? [],
    images: day.images ?? [],
    things_to_carry: day.things_to_carry ?? [],
    breakfast: Boolean(day.breakfast),
    lunch: Boolean(day.lunch),
    dinner: Boolean(day.dinner),
    breakfast_hotels: mealHotelPair(day.breakfast_hotels, day.hotel_name),
    lunch_hotels: mealHotelPair(day.lunch_hotels, null),
    // Never invent dinner hotels from hotel_name — that falsely marks Dinner on stay hotels.
    dinner_hotels: mealHotelPair(day.dinner_hotels, null),
    epai_plan_only: Boolean(day.epai_plan_only),
    guest_self_booked_hotel: Boolean(day.guest_self_booked_hotel),
    category_hotel_picks: normalizeCategoryHotelPicksMap(day.category_hotel_picks),
    // Keep empty strings — they are intentional "Select location" slots from Add Location.
    locations: Array.isArray(day.locations)
      ? day.locations.map((l) => (typeof l === "string" ? l.trim() : ""))
      : [],
    guide_required: Boolean(day.guide_required),
    completion_pct: day.completion_pct ?? 0,
    packing_tips: day.packing_tips ?? "",
    internal_notes: day.internal_notes ?? "",
    client_notes: day.client_notes ?? "",
    operations_notes: day.operations_notes ?? "",
    status: day.status ?? "planned",
  };
}

/** Harden snapshots from localStorage / seed / Supabase so UI never hits undefined.map */
export function normalizeSnapshot(snapshot: ItinerarySnapshot | null | undefined): ItinerarySnapshot {
  if (!snapshot) {
    return {
      header: {
        title: "Untitled itinerary",
        subtitle: null,
        tour_code: null,
        duration_label: null,
        alternate_titles: [],
      },
      client: {
        title: "Mr",
        client_name: "Guest",
        email: null,
        email2: null,
        phone: null,
        adults: null,
        children_5_12: null,
        children_below_5: null,
        rooms: null,
        extra_beds: null,
        travel_date: null,
        food_preference: null,
        special_requests: null,
      },
      days: emptyCustomItineraryDays(),
      inclusions: [],
      exclusions: [],
      inclusion_items: [],
      exclusion_items: [],
      terms: "",
      internal_notes: "",
      public_notes: "",
      category_pricing: [],
      source_package_id: null,
      cost_sheet: emptyCostSheet(),
      vehicle_type: null,
      vehicle_types: [],
      price_basis: "whole_group",
      final_price: null,
      optional_inclusion_keys: [],
      preview_theme: 2,
      advance_percent: 20,
      selected_contact_id: null,
    };
  }

  const normalizedDays = (snapshot.days?.length ? snapshot.days : emptyCustomItineraryDays()).map(
    normalizeDay
  );
  // Custom builds should never keep auto-filled "Day 1" / "Day 2" labels.
  const days = snapshot.source_package_id
    ? normalizedDays
    : clearPlaceholderDayTitles(normalizedDays);

  return {
    ...snapshot,
    header: {
      title: snapshot.header?.title ?? "Untitled itinerary",
      subtitle: snapshot.header?.subtitle ?? null,
      tour_code: snapshot.header?.tour_code ?? null,
      duration_label: snapshot.header?.duration_label ?? null,
      alternate_titles: snapshot.header?.alternate_titles ?? [],
    },
    client: {
      title: snapshot.client?.title ?? "Mr",
      client_name: snapshot.client?.client_name ?? "Guest",
      email: snapshot.client?.email ?? null,
      email2: snapshot.client?.email2 ?? null,
      phone: snapshot.client?.phone ?? null,
      adults: snapshot.client?.adults ?? null,
      children_5_12: snapshot.client?.children_5_12 ?? null,
      children_below_5: snapshot.client?.children_below_5 ?? null,
      rooms: snapshot.client?.rooms ?? null,
      extra_beds: snapshot.client?.extra_beds ?? null,
      travel_date: snapshot.client?.travel_date ?? null,
      food_preference: snapshot.client?.food_preference ?? null,
      special_requests: snapshot.client?.special_requests ?? null,
    },
    days,
    inclusions: snapshot.inclusions ?? [],
    exclusions: snapshot.exclusions ?? [],
    inclusion_items:
      snapshot.inclusion_items?.length
        ? snapshot.inclusion_items
        : snapshot.inclusions?.length
          ? stringsToContentBlocks(snapshot.inclusions)
          : [],
    exclusion_items:
      snapshot.exclusion_items?.length
        ? snapshot.exclusion_items
        : snapshot.exclusions?.length
          ? stringsToContentBlocks(snapshot.exclusions)
          : [],
    terms: snapshot.terms ?? "",
    internal_notes: snapshot.internal_notes ?? "",
    public_notes: snapshot.public_notes ?? "",
    source_package_id: snapshot.source_package_id ?? null,
    cost_sheet: snapshot.cost_sheet ?? emptyCostSheet(),
    vehicle_type: snapshot.vehicle_type ?? null,
    vehicle_types:
      snapshot.vehicle_types?.length
        ? snapshot.vehicle_types
        : snapshot.vehicle_type
          ? [snapshot.vehicle_type]
          : [],
    price_basis: snapshot.price_basis ?? "whole_group",
    final_price: snapshot.final_price ?? null,
    optional_inclusion_keys: snapshot.optional_inclusion_keys ?? [],
    preview_theme: clampPreviewTheme(snapshot.preview_theme),
    advance_percent: clampAdvancePercent(snapshot.advance_percent),
    selected_contact_id: snapshot.selected_contact_id ?? null,
    category_pricing: (snapshot.category_pricing ?? []).map((t) => ({
      ...t,
      booking_amount: t.booking_amount ?? null,
    })),
  };
}

export function normalizeRevision(revision: ItineraryRevision): ItineraryRevision {
  return {
    ...revision,
    snapshot: normalizeSnapshot(revision.snapshot),
  };
}

export function normalizeRecord(record: ClientItineraryRecord): ClientItineraryRecord {
  const owner =
    record.owner_name?.trim() && record.owner_name.trim() !== "System"
      ? record.owner_name.trim()
      : record.created_by?.trim() && record.created_by.trim() !== "System"
        ? record.created_by.trim()
        : "—";
  return {
    ...record,
    created_by: owner,
    owner_name: owner,
    category_totals: record.category_totals ?? [],
    payment_status: record.payment_status ?? "unpaid",
    amount_paid: record.amount_paid ?? 0,
    deleted_at: record.deleted_at ?? null,
    source_package_id: record.source_package_id ?? null,
    lead_id: record.lead_id ?? null,
    lead_source: record.lead_source ?? null,
    customer_id: record.customer_id ?? null,
  };
}
