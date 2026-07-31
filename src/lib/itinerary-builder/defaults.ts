import type {
  ClientDetails,
  CostSheet,
  DayActivity,
  ItineraryDay,
  ItinerarySnapshot,
} from "@/types/itinerary-builder";

export function newUuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyClientDetails(overrides?: Partial<ClientDetails>): ClientDetails {
  return {
    title: "Mr",
    client_name: "",
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
    ...overrides,
  };
}

export function emptyActivity(sortOrder = 0): DayActivity {
  return {
    activity_uuid: newUuid(),
    sort_order: sortOrder,
    title: "",
    description: "",
    start_time: null,
    end_time: null,
    entry_fee: 0,
    guide_required: false,
  };
}

export function emptyDay(dayNumber: number): ItineraryDay {
  return {
    day_uuid: newUuid(),
    day_number: dayNumber,
    day_title: `Day ${dayNumber}`,
    alternate_day_titles: [],
    day_subtitle: null,
    day_theme: null,
    day_description: "",
    start_time: "09:00",
    end_time: "18:00",
    travel_distance_km: null,
    travel_time_minutes: null,
    location: null,
    hotel_name: null,
    room_category: null,
    meal_plan: "MAP",
    breakfast: true,
    lunch: false,
    dinner: true,
    breakfast_hotels: [null, null],
    lunch_hotels: [null, null],
    dinner_hotels: [null, null],
    epai_plan_only: false,
    guest_self_booked_hotel: false,
    vehicle_type: null,
    pickup_location: null,
    drop_location: null,
    guide_required: false,
    activities: [],
    images: [],
    internal_notes: "",
    client_notes: "",
    operations_notes: "",
    status: "planned",
    completion_pct: 0,
    packing_tips: "",
    things_to_carry: [],
  };
}

export function emptyCostSheet(): CostSheet {
  return {
    currency: "INR",
    line_items: [],
    subtotal: 0,
    markup_total: 0,
    discount_total: 0,
    tax_total: 0,
    grand_total: 0,
    net_profit: 0,
    margin_pct: 0,
  };
}

export function emptySnapshot(overrides?: Partial<ItinerarySnapshot>): ItinerarySnapshot {
  return {
    header: {
      title: "New Client Itinerary",
      subtitle: null,
      tour_code: null,
      duration_label: null,
      alternate_titles: [],
    },
    client: emptyClientDetails(),
    days: [emptyDay(1)],
    inclusions: ["Accommodation as per plan", "Private AC vehicle for sightseeing"],
    exclusions: ["Air fare / train fare", "Personal expenses", "Entry fees unless specified"],
    inclusion_items: [],
    exclusion_items: [],
    terms: "50% advance to confirm. Balance due 7 days before travel. Cancellation as per company policy.",
    internal_notes: "",
    public_notes: "",
    category_pricing: [],
    source_package_id: null,
    cost_sheet: emptyCostSheet(),
    vehicle_type: null,
    price_basis: "whole_group",
    final_price: null,
    optional_inclusion_keys: [],
    preview_theme: 1,
    advance_percent: 20,
    selected_contact_id: null,
    ...overrides,
    vehicle_types:
      overrides?.vehicle_types ??
      (overrides?.vehicle_type ? [overrides.vehicle_type] : []),
  };
}

export const ROOM_CATEGORIES = [
  "Standard",
  "Deluxe",
  "Super Deluxe",
  "Luxury",
  "Heritage",
] as const;

export const MEAL_PLANS = ["EP", "CP", "MAP", "AP"] as const;

export const DAY_THEMES = [
  "Heritage",
  "Adventure",
  "Spiritual",
  "Leisure",
  "Transit",
  "Desert",
  "Wildlife",
] as const;

export const VEHICLE_TYPES = [
  "Sedan",
  "SUV",
  "Innova Crysta",
  "Tempo Traveller 12",
  "Tempo Traveller 17",
  "Mini Bus",
] as const;

export const HOTEL_OPTIONS = [
  "Taj Rambagh Palace — Jaipur",
  "ITC Rajputana — Jaipur",
  "The Oberoi Udaivilas — Udaipur",
  "RAAS Jodhpur",
  "Suryagarh — Jaisalmer",
  "Amanbagh — Ajabgarh",
] as const;

/** Fixed V1 optional inclusion checklist */
export const OPTIONAL_INCLUSIONS = [
  {
    key: "ranthambhore_canter",
    label: "Ranthambhore Canter Safari",
    description: "Jungle safari in a comfortable canter through Ranthambhore National Park.",
  },
  {
    key: "ranthambhore_gypsy",
    label: "Ranthambhore Gypsy Safari",
    description: "More adventurous safari by gypsy jeep in Ranthambhore.",
  },
  {
    key: "jaisalmer_desert",
    label: "Jaisalmer Desert Add-ons",
    description: "Desert stay including camel rides, bonfire, dinner, and cultural programs.",
  },
] as const;
