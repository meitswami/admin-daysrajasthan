import type { CategoryPricingTier, HotelCategoryKey, ItinerarySnapshot } from "@/types/itinerary-builder";
import { HOTEL_CATEGORY_OPTIONS } from "@/types/itinerary-builder";
import {
  applyCostToSnapshot,
  durationLabelFromDays,
  resolveCategoryTierPricing,
} from "./cost-engine";
import { emptyDay, emptySnapshot, newUuid } from "./defaults";

export type PackageCatalogLocation = {
  name: string;
  nights: number;
};

export type PackageCatalogEntry = {
  id: string;
  tour_code: string;
  title: string;
  duration_label: string;
  duration_nights: number;
  duration_days: number;
  locations: PackageCatalogLocation[];
  updated_at: string;
  /** Builds a prefilled snapshot template for the wizard */
  buildTemplate: () => ItinerarySnapshot;
};

function cloneDaysWithRoomCategory(
  baseDays: ReturnType<typeof emptyDay>[],
  roomCategory: string
) {
  return baseDays.map((d) => ({
    ...d,
    day_uuid: newUuid(),
    room_category: d.hotel_name ? roomCategory : d.room_category,
  }));
}

function jaipurDays() {
  const day1 = emptyDay(1);
  day1.day_title = "Arrival in Jaipur — The Pink City";
  day1.day_subtitle = "City Palace & local bazaars";
  day1.day_theme = "Heritage";
  day1.day_description =
    "Received at airport/railway station and transferred to hotel. Evening visit to Statue Circle, Birla Mandir and local markets.";
  day1.hotel_name = "ITC Rajputana — Jaipur";
  day1.room_category = "Deluxe";
  day1.vehicle_type = "SUV";
  day1.pickup_location = "Jaipur Airport";

  const day2 = emptyDay(2);
  day2.day_title = "Jaipur Sightseeing";
  day2.day_subtitle = "Amber Fort & Hawa Mahal";
  day2.day_theme = "Heritage";
  day2.hotel_name = "ITC Rajputana — Jaipur";
  day2.room_category = "Deluxe";
  day2.vehicle_type = "SUV";

  const day3 = emptyDay(3);
  day3.day_title = "Departure from Jaipur";
  day3.day_theme = "Transit";
  day3.day_description = "Breakfast at hotel. Transfer to airport/railway station.";
  day3.vehicle_type = "SUV";
  day3.drop_location = "Jaipur Airport";
  day3.breakfast = true;

  return [day1, day2, day3];
}

function udaipurDays() {
  const titles = [
    "Arrival in Udaipur",
    "City Palace & Lake Pichola",
    "Departure",
  ];
  return titles.map((title, i) => {
    const d = emptyDay(i + 1);
    d.day_title = title;
    d.hotel_name = i < 2 ? "The Oberoi Udaivilas — Udaipur" : null;
    d.room_category = d.hotel_name ? "Deluxe" : null;
    d.vehicle_type = "Sedan";
    return d;
  });
}

function pushkarJaipurDays() {
  const day1 = emptyDay(1);
  day1.day_title = "Jaipur arrival";
  day1.hotel_name = "ITC Rajputana — Jaipur";
  day1.room_category = "Deluxe";
  day1.vehicle_type = "SUV";

  const day2 = emptyDay(2);
  day2.day_title = "Jaipur to Pushkar";
  day2.hotel_name = "Pushkar Palace";
  day2.room_category = "Deluxe";
  day2.vehicle_type = "SUV";

  const day3 = emptyDay(3);
  day3.day_title = "Pushkar sightseeing & return";
  day3.vehicle_type = "SUV";

  const day4 = emptyDay(4);
  day4.day_title = "Departure from Jaipur";
  day4.vehicle_type = "SUV";

  return [day1, day2, day3, day4];
}

export const PACKAGE_CATALOG: PackageCatalogEntry[] = [
  {
    id: "pkg-wrt001",
    tour_code: "WRT001",
    title: "02 Days Jaipur Tour Package",
    duration_label: "01 Night / 02 Days",
    duration_nights: 1,
    duration_days: 2,
    locations: [{ name: "Jaipur", nights: 1 }],
    updated_at: "2025-11-24",
    buildTemplate: () =>
      applyCostToSnapshot(
        emptySnapshot({
          header: {
            title: "02 Days Jaipur Tour Package",
            subtitle: null,
            tour_code: "WRT001",
            duration_label: "01 Night / 02 Days",
            alternate_titles: [],
          },
          days: jaipurDays().slice(0, 2),
          source_package_id: "pkg-wrt001",
        })
      ),
  },
  {
    id: "pkg-wrt002",
    tour_code: "WRT002",
    title: "03 Days Jaipur Heritage Tour",
    duration_label: "02 Nights / 03 Days",
    duration_nights: 2,
    duration_days: 3,
    locations: [{ name: "Jaipur", nights: 2 }],
    updated_at: "2025-11-24",
    buildTemplate: () =>
      applyCostToSnapshot(
        emptySnapshot({
          header: {
            title: "03 Days Jaipur Heritage Tour",
            subtitle: null,
            tour_code: "WRT002",
            duration_label: "02 Nights / 03 Days",
            alternate_titles: [],
          },
          days: jaipurDays(),
          source_package_id: "pkg-wrt002",
        })
      ),
  },
  {
    id: "pkg-wrt006",
    tour_code: "WRT006",
    title: "04 Days Udaipur, Nathdwara and Haldi Ghati Tour Package",
    duration_label: "03 Nights / 04 Days",
    duration_nights: 3,
    duration_days: 4,
    locations: [
      { name: "Udaipur", nights: 2 },
      { name: "Nathdwara", nights: 1 },
    ],
    updated_at: "2025-11-24",
    buildTemplate: () => {
      const days = udaipurDays();
      const day4 = emptyDay(4);
      day4.day_title = "Nathdwara & Haldi Ghati";
      day4.hotel_name = "Nathdwara Guest House";
      day4.room_category = "Deluxe";
      day4.vehicle_type = "SUV";
      return applyCostToSnapshot(
        emptySnapshot({
          header: {
            title: "04 Days Udaipur, Nathdwara and Haldi Ghati Tour Package",
            subtitle: null,
            tour_code: "WRT006",
            duration_label: "03 Nights / 04 Days",
            alternate_titles: [],
          },
          days: [...days.slice(0, 3), day4],
          source_package_id: "pkg-wrt006",
        })
      );
    },
  },
  {
    id: "pkg-wrt010",
    tour_code: "WRT010",
    title: "04 Days Jaipur & Pushkar Tour Package",
    duration_label: "03 Nights / 04 Days",
    duration_nights: 3,
    duration_days: 4,
    locations: [
      { name: "Jaipur", nights: 2 },
      { name: "Pushkar", nights: 1 },
    ],
    updated_at: "2025-11-24",
    buildTemplate: () =>
      applyCostToSnapshot(
        emptySnapshot({
          header: {
            title: "04 Days Jaipur & Pushkar Tour Package",
            subtitle: null,
            tour_code: "WRT010",
            duration_label: "03 Nights / 04 Days",
            alternate_titles: [],
          },
          days: pushkarJaipurDays(),
          source_package_id: "pkg-wrt010",
        })
      ),
  },
  {
    id: "pkg-wrt015",
    tour_code: "WRT015",
    title: "05 Days Golden Triangle",
    duration_label: "04 Nights / 05 Days",
    duration_nights: 4,
    duration_days: 5,
    locations: [
      { name: "Delhi", nights: 1 },
      { name: "Agra", nights: 1 },
      { name: "Jaipur", nights: 2 },
    ],
    updated_at: "2025-11-24",
    buildTemplate: () => {
      const days = ["Delhi arrival", "Delhi sightseeing", "Delhi → Agra", "Agra → Jaipur", "Jaipur → Delhi"].map(
        (title, i) => {
          const d = emptyDay(i + 1);
          d.day_title = title;
          d.hotel_name = i < 4 ? "ITC Rajputana — Jaipur" : null;
          d.room_category = d.hotel_name ? "Deluxe" : null;
          d.vehicle_type = "Innova Crysta";
          return d;
        }
      );
      return applyCostToSnapshot(
        emptySnapshot({
          header: {
            title: "05 Days Golden Triangle",
            subtitle: "Delhi · Agra · Jaipur",
            tour_code: "WRT015",
            duration_label: "04 Nights / 05 Days",
            alternate_titles: [],
          },
          days,
          source_package_id: "pkg-wrt015",
        })
      );
    },
  },
];

export function listPackageCatalog() {
  return [...PACKAGE_CATALOG];
}

export function getPackageByTourCode(code: string) {
  return PACKAGE_CATALOG.find((p) => p.tour_code.toLowerCase() === code.toLowerCase()) ?? null;
}

export function getPackageById(id: string) {
  return PACKAGE_CATALOG.find((p) => p.id === id) ?? null;
}

export function filterPackages(opts: {
  search?: string;
  durationNights?: number | "all";
  tourCode?: string;
}) {
  let list = listPackageCatalog();
  if (opts.durationNights && opts.durationNights !== "all") {
    list = list.filter((p) => p.duration_nights === opts.durationNights);
  }
  if (opts.tourCode?.trim()) {
    const q = opts.tourCode.trim().toLowerCase();
    list = list.filter((p) => p.tour_code.toLowerCase().includes(q));
  }
  if (opts.search?.trim()) {
    const q = opts.search.trim().toLowerCase();
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.tour_code.toLowerCase().includes(q) ||
        p.locations.some((l) => l.name.toLowerCase().includes(q))
    );
  }
  return list;
}

export function uniqueDurations() {
  const nights = new Set(PACKAGE_CATALOG.map((p) => p.duration_nights));
  return [...nights].sort((a, b) => a - b);
}

/** Apply a hotel tier room category across all hotel nights for cost preview */
export function snapshotForCategoryPreview(
  snapshot: ItinerarySnapshot,
  roomCategory: string
): ItinerarySnapshot {
  const days = (snapshot.days ?? []).map((d) => ({
    ...d,
    room_category: d.hotel_name ? roomCategory : d.room_category,
  }));
  return applyCostToSnapshot({
    ...snapshot,
    days,
    header: {
      ...snapshot.header,
      duration_label: durationLabelFromDays(days),
    },
  });
}

export function buildCategoryPricing(
  snapshot: ItinerarySnapshot,
  selectedKeys: HotelCategoryKey[],
  discounts: Partial<Record<HotelCategoryKey, number | null>> = {},
  packageOverrides: Partial<Record<HotelCategoryKey, number | null>> = {}
): CategoryPricingTier[] {
  return selectedKeys.slice(0, 2).map((key) => {
    const opt = HOTEL_CATEGORY_OPTIONS.find((o) => o.key === key)!;
    const priced = snapshotForCategoryPreview(snapshot, opt.room_category);
    const autoPrice = priced.cost_sheet.grand_total;
    const override = packageOverrides[key];
    const package_price = override != null && override > 0 ? override : autoPrice;
    const discount_price = discounts[key] ?? null;
    const manual_override = override != null && override > 0 ? override : null;
    // package_price already includes override; pass manual_override null to avoid double-applying
    const { grand_total, booking_amount } = resolveCategoryTierPricing({
      package_price,
      discount_price,
      manual_override: null,
    });
    return {
      category_key: key,
      label: opt.label,
      room_category: opt.room_category,
      package_price,
      discount_price,
      booking_amount,
      grand_total,
      manual_override,
    };
  });
}
