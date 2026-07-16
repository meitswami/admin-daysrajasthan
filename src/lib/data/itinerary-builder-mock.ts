import type {
  ClientItineraryRecord,
  HotelCategoryKey,
  ItineraryRevision,
  ItinerarySnapshot,
  WorkflowStatus,
} from "@/types/itinerary-builder";
import { applyCostToSnapshot, categoryTotalsFromSnapshot, primaryGrandTotal } from "../itinerary-builder/cost-engine";
import { emptyDay, emptySnapshot, newUuid } from "../itinerary-builder/defaults";
import { buildCategoryPricing } from "../itinerary-builder/package-catalog";
import { createRevision } from "../itinerary-builder/revisions";

const DEMO_USER = "Admin";

function buildJaipurSnapshot(): ItinerarySnapshot {
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
  day1.activities = [
    {
      activity_uuid: newUuid(),
      sort_order: 0,
      title: "City Palace & Jantar Mantar",
      description: "Guided heritage walk with licensed guide.",
      start_time: "10:00",
      end_time: "13:00",
      entry_fee: 500,
      guide_required: true,
    },
  ];

  const day2 = emptyDay(2);
  day2.day_title = "Jaipur Sightseeing";
  day2.day_subtitle = "Amber Fort & Hawa Mahal";
  day2.day_theme = "Heritage";
  day2.day_description =
    "Full day sightseeing including Amber Fort, Jal Mahal photo stop, Hawa Mahal and Johari Bazaar.";
  day2.hotel_name = "ITC Rajputana — Jaipur";
  day2.room_category = "Deluxe";
  day2.vehicle_type = "SUV";
  day2.activities = [
    {
      activity_uuid: newUuid(),
      sort_order: 0,
      title: "Amber Fort",
      description: "Elephant/jeep ride optional.",
      start_time: "09:30",
      end_time: "12:30",
      entry_fee: 550,
      guide_required: true,
    },
  ];

  const day3 = emptyDay(3);
  day3.day_title = "Departure from Jaipur";
  day3.day_theme = "Transit";
  day3.day_description = "Breakfast at hotel. Transfer to airport/railway station for onward journey.";
  day3.vehicle_type = "SUV";
  day3.drop_location = "Jaipur Airport";
  day3.breakfast = true;
  day3.lunch = false;
  day3.dinner = false;

  return applyCostToSnapshot(
    emptySnapshot({
      header: {
        title: "3 Days Jaipur Heritage Tour",
        subtitle: "Pink City experience for Mr. Ranveer Singh",
        tour_code: "WRT006",
        duration_label: "2 Nights / 3 Days",
        alternate_titles: [],
      },
      client: {
        title: "Mr",
        client_name: "Ranveer Singh",
        email: "ranveer@example.com",
        email2: null,
        phone: "+91 98765 43210",
        adults: 2,
        children_5_12: 0,
        children_below_5: 0,
        rooms: 1,
        extra_beds: 0,
        travel_date: "2026-08-05",
        food_preference: "Vegetarian",
        special_requests: "Late check-in on Day 1",
      },
      days: [day1, day2, day3],
    })
  );
}

function withCategoryPricing(
  snapshot: ItinerarySnapshot,
  keys: HotelCategoryKey[]
): ItinerarySnapshot {
  const category_pricing = buildCategoryPricing(snapshot, keys);
  return applyCostToSnapshot({ ...snapshot, category_pricing });
}

function buildGoldenTriangleSnapshot(): ItinerarySnapshot {
  const days = ["Delhi arrival", "Delhi sightseeing", "Delhi → Agra", "Agra → Jaipur", "Jaipur → Delhi"].map(
    (title, i) => {
      const d = emptyDay(i + 1);
      d.day_title = title;
      d.room_category = "Super Deluxe";
      d.hotel_name = i < 2 ? "Taj Rambagh Palace — Jaipur" : "ITC Rajputana — Jaipur";
      d.vehicle_type = "Innova Crysta";
      return d;
    }
  );

  return withCategoryPricing(
    applyCostToSnapshot(
      emptySnapshot({
        header: {
          title: "5 Days Golden Triangle",
          subtitle: "Delhi · Agra · Jaipur",
          tour_code: "WRT010",
          duration_label: "4 Nights / 5 Days",
          alternate_titles: [],
        },
      client: {
        title: "Mr",
        client_name: "Vikas Sharma",
        email: "vikas@example.com",
        email2: null,
        phone: "+91 91234 56789",
        adults: 4,
        children_5_12: 1,
        children_below_5: 0,
        rooms: 2,
        extra_beds: 0,
        travel_date: "2026-09-02",
        food_preference: null,
        special_requests: null,
      },
        days,
      })
    ),
    ["deluxe_hotels", "super_deluxe_hotels"]
  );
}

function seedRecord(
  quote_id: string,
  workflow_status: WorkflowStatus,
  snapshot: ItinerarySnapshot,
  owner_name: string,
  extras?: Partial<ClientItineraryRecord>
): { record: ClientItineraryRecord; revisions: ItineraryRevision[] } {
  const itinerary_id = newUuid();
  const rev1 = createRevision({
    itinerary_id,
    version_number: 1,
    parent_revision_id: null,
    snapshot,
    save_type: "manual",
    milestone_label: workflow_status === "draft" ? "Draft 1" : "Initial proposal",
    created_by: DEMO_USER,
  });

  const revisions: ItineraryRevision[] = [rev1];
  let current = rev1;
  let version = 1;

  if (workflow_status !== "draft") {
    const snap2 = JSON.parse(JSON.stringify(snapshot)) as ItinerarySnapshot;
    snap2.header.subtitle = `${snap2.header.subtitle ?? ""} (Revision 2)`.trim();
    version = 2;
    const rev2 = createRevision({
      itinerary_id,
      version_number: version,
      parent_revision_id: rev1.id,
      snapshot: snap2,
      save_type: "manual",
      milestone_label: "Pricing updated",
      created_by: owner_name,
      previous_snapshot: rev1.snapshot,
    });
    revisions.push(rev2);
    current = rev2;
  }

  const normalized = applyCostToSnapshot(snapshot);
  const category_totals = categoryTotalsFromSnapshot(normalized);

  const record: ClientItineraryRecord = {
    id: itinerary_id,
    quote_id,
    type: "client_itinerary",
    title: normalized.header.title,
    tour_code: normalized.header.tour_code,
    workflow_status,
    current_revision_id: current.id,
    current_version: version,
    created_by: owner_name,
    owner_name,
    created_at: "2026-07-01T10:00:00Z",
    updated_at: new Date().toISOString(),
    client_name: normalized.client.client_name,
    client_email: normalized.client.email,
    client_phone: normalized.client.phone,
    travel_date: normalized.client.travel_date,
    adults: normalized.client.adults,
    children: normalized.client.children_5_12 + normalized.client.children_below_5,
    rooms: normalized.client.rooms,
    grand_total: primaryGrandTotal(current.snapshot),
    category_totals,
    currency: current.snapshot.cost_sheet.currency,
    margin_pct: current.snapshot.cost_sheet.margin_pct,
    payment_status: extras?.payment_status ?? "unpaid",
    amount_paid: extras?.amount_paid ?? 0,
    deleted_at: null,
    source_package_id: normalized.source_package_id,
    lead_id: null,
    lead_source: null,
    customer_id: null,
    ...extras,
  };

  return { record, revisions };
}

const s1 = seedRecord(
  "QRT807",
  "client_shared",
  withCategoryPricing(buildJaipurSnapshot(), ["deluxe_hotels", "super_deluxe_hotels"]),
  "Shatrughan Singh"
);
const s2 = seedRecord(
  "QRT805",
  "manager_approval",
  buildGoldenTriangleSnapshot(),
  "Priya Vohra",
  { payment_status: "partial", amount_paid: 50000 }
);
const s3 = seedRecord(
  "QRT803",
  "draft",
  withCategoryPricing(buildGoldenTriangleSnapshot(), ["deluxe_hotels"]),
  "Priya Vohra"
);
s3.record.client_name = "Nandita Mehta";
s3.record.quote_id = "QRT803";
s3.revisions[0].snapshot.client.client_name = "Nandita Mehta";

export const SEED_ITINERARY_RECORDS: ClientItineraryRecord[] = [
  s1.record,
  s2.record,
  s3.record,
];

export const SEED_REVISIONS: Record<string, ItineraryRevision[]> = {
  [s1.record.id]: s1.revisions,
  [s2.record.id]: s2.revisions,
  [s3.record.id]: s3.revisions,
};

export function nextQuoteId(records: ClientItineraryRecord[]): string {
  const nums = records
    .map((r) => parseInt(r.quote_id.replace(/\D/g, ""), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 800) + 1;
  return `QRT${next}`;
}
