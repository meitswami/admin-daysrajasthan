import type {
  DayCategoryHotelPicks,
  HotelCategoryKey,
  ItineraryDay,
} from "@/types/itinerary-builder";

export function emptyCategoryHotelPicks(
  roomCategory: string | null = null
): DayCategoryHotelPicks {
  return {
    breakfast_hotels: [null, null],
    lunch_hotels: [null, null],
    dinner_hotels: [null, null],
    epai_plan_only: false,
    guest_self_booked_hotel: false,
    hotel_name: null,
    room_category: roomCategory,
  };
}

function mealPair(
  value: [string | null, string | null] | undefined
): [string | null, string | null] {
  return [value?.[0] ?? null, value?.[1] ?? null];
}

/** Normalize a stored picks object (or build empty). */
export function normalizeCategoryHotelPicks(
  picks: DayCategoryHotelPicks | null | undefined,
  roomCategory: string | null = null
): DayCategoryHotelPicks {
  if (!picks) return emptyCategoryHotelPicks(roomCategory);
  return {
    breakfast_hotels: mealPair(picks.breakfast_hotels),
    lunch_hotels: mealPair(picks.lunch_hotels),
    dinner_hotels: mealPair(picks.dinner_hotels),
    epai_plan_only: Boolean(picks.epai_plan_only),
    guest_self_booked_hotel: Boolean(picks.guest_self_booked_hotel),
    hotel_name: picks.hotel_name ?? picks.breakfast_hotels?.[0] ?? null,
    room_category: picks.room_category ?? roomCategory,
  };
}

/** Legacy day fields → picks (used when migrating older itineraries). */
export function legacyDayToCategoryPicks(
  day: ItineraryDay,
  roomCategory: string | null = null
): DayCategoryHotelPicks {
  return {
    breakfast_hotels: mealPair(day.breakfast_hotels),
    lunch_hotels: mealPair(day.lunch_hotels),
    dinner_hotels: mealPair(day.dinner_hotels),
    epai_plan_only: Boolean(day.epai_plan_only),
    guest_self_booked_hotel: Boolean(day.guest_self_booked_hotel),
    hotel_name: day.hotel_name ?? day.breakfast_hotels?.[0] ?? null,
    room_category: roomCategory ?? day.room_category ?? null,
  };
}

function dayHasLegacyHotels(day: ItineraryDay): boolean {
  return Boolean(
    day.hotel_name ||
      day.breakfast_hotels?.[0] ||
      day.breakfast_hotels?.[1] ||
      day.lunch_hotels?.[0] ||
      day.dinner_hotels?.[0] ||
      day.epai_plan_only ||
      day.guest_self_booked_hotel
  );
}

/**
 * Resolve picks for a category. Falls back to legacy day hotels for the
 * primary tier when that category has no stored picks yet.
 */
export function getCategoryHotelPicks(
  day: ItineraryDay,
  categoryKey: HotelCategoryKey,
  roomCategory: string | null,
  primaryKey: HotelCategoryKey | null
): DayCategoryHotelPicks {
  const stored = day.category_hotel_picks?.[categoryKey];
  if (stored) return normalizeCategoryHotelPicks(stored, roomCategory);
  if (primaryKey === categoryKey && dayHasLegacyHotels(day)) {
    return legacyDayToCategoryPicks(day, roomCategory);
  }
  return emptyCategoryHotelPicks(roomCategory);
}

/** Overlay category picks onto day fields for the night-card UI. */
export function dayViewForCategory(
  day: ItineraryDay,
  categoryKey: HotelCategoryKey,
  roomCategory: string | null,
  primaryKey: HotelCategoryKey | null
): ItineraryDay {
  const picks = getCategoryHotelPicks(day, categoryKey, roomCategory, primaryKey);
  return {
    ...day,
    breakfast_hotels: picks.breakfast_hotels,
    lunch_hotels: picks.lunch_hotels,
    dinner_hotels: picks.dinner_hotels,
    epai_plan_only: picks.epai_plan_only,
    guest_self_booked_hotel: picks.guest_self_booked_hotel,
    hotel_name: picks.hotel_name,
    room_category: picks.room_category ?? roomCategory,
  };
}

/** Persist night-card edits into category_hotel_picks (+ legacy mirror for primary). */
export function applyCategoryDayUpdate(
  day: ItineraryDay,
  categoryKey: HotelCategoryKey,
  roomCategory: string | null,
  primaryKey: HotelCategoryKey | null,
  updater: (d: ItineraryDay) => ItineraryDay
): ItineraryDay {
  const view = dayViewForCategory(day, categoryKey, roomCategory, primaryKey);
  const next = updater(view);
  const picks: DayCategoryHotelPicks = {
    breakfast_hotels: mealPair(next.breakfast_hotels),
    lunch_hotels: mealPair(next.lunch_hotels),
    dinner_hotels: mealPair(next.dinner_hotels),
    epai_plan_only: Boolean(next.epai_plan_only),
    guest_self_booked_hotel: Boolean(next.guest_self_booked_hotel),
    hotel_name: next.hotel_name ?? next.breakfast_hotels?.[0] ?? null,
    room_category: roomCategory,
  };
  const category_hotel_picks: Partial<Record<HotelCategoryKey, DayCategoryHotelPicks>> = {
    ...(day.category_hotel_picks ?? {}),
    [categoryKey]: picks,
  };
  const result: ItineraryDay = { ...day, category_hotel_picks };
  if (primaryKey === categoryKey) {
    return {
      ...result,
      breakfast_hotels: picks.breakfast_hotels,
      lunch_hotels: picks.lunch_hotels,
      dinner_hotels: picks.dinner_hotels,
      epai_plan_only: picks.epai_plan_only,
      guest_self_booked_hotel: picks.guest_self_booked_hotel,
      hotel_name: picks.hotel_name,
      room_category: roomCategory,
    };
  }
  return result;
}

/** Drop picks for categories that are no longer selected. */
export function pruneCategoryHotelPicks(
  day: ItineraryDay,
  selectedKeys: HotelCategoryKey[]
): ItineraryDay {
  const keep = new Set(selectedKeys);
  const prev = day.category_hotel_picks ?? {};
  const next: Partial<Record<HotelCategoryKey, DayCategoryHotelPicks>> = {};
  for (const key of Object.keys(prev) as HotelCategoryKey[]) {
    if (keep.has(key) && prev[key]) next[key] = prev[key];
  }
  const primary = selectedKeys[0] ?? null;
  if (!primary) {
    return {
      ...day,
      category_hotel_picks: next,
      breakfast_hotels: [null, null],
      lunch_hotels: [null, null],
      dinner_hotels: [null, null],
      hotel_name: null,
      room_category: null,
      epai_plan_only: false,
      guest_self_booked_hotel: false,
    };
  }
  const primaryPicks = getCategoryHotelPicks(day, primary, null, primary);
  return {
    ...day,
    category_hotel_picks: {
      ...next,
      [primary]: primaryPicks,
    },
    breakfast_hotels: primaryPicks.breakfast_hotels,
    lunch_hotels: primaryPicks.lunch_hotels,
    dinner_hotels: primaryPicks.dinner_hotels,
    epai_plan_only: primaryPicks.epai_plan_only,
    guest_self_booked_hotel: primaryPicks.guest_self_booked_hotel,
    hotel_name: primaryPicks.hotel_name,
    room_category: primaryPicks.room_category,
  };
}

export function hotelLabelsForCategoryPicks(picks: DayCategoryHotelPicks): string[] {
  // Stay options are the breakfast hotel pair (max 2). Do not union lunch/dinner —
  // those are meal tags on the same hotels, not extra hotel options.
  const labels = picks.breakfast_hotels.filter(Boolean) as string[];
  if (labels.length > 0) return Array.from(new Set(labels));
  return picks.hotel_name ? [picks.hotel_name] : [];
}
