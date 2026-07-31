/** Version 2 Enterprise Itinerary Builder — core domain types (FRS Part B) */

export type ItineraryRecordType = "website_package" | "client_itinerary";

export type WorkflowStatus =
  | "draft"
  | "sales_review"
  | "manager_approval"
  | "accounts"
  | "operations"
  | "client_shared"
  | "client_approved"
  | "booking_confirmed"
  | "completed"
  | "archived";

export type RevisionSaveType =
  | "autosave"
  | "manual"
  | "rollback"
  | "duplicate"
  | "workflow_transition";

export type DayStatus = "planned" | "confirmed" | "in_progress" | "completed";

export type CostLineCategory =
  | "hotel"
  | "vehicle"
  | "guide"
  | "meal"
  | "activity"
  | "markup"
  | "discount"
  | "tax";

export type HotelCategoryKey =
  | "deluxe_hotels"
  | "super_deluxe_hotels"
  | "heritage_hotels"
  | "luxury_hotels";

export type PaymentStatus = "unpaid" | "partial" | "paid";

export const HOTEL_CATEGORY_OPTIONS: {
  key: HotelCategoryKey;
  label: string;
  room_category: string;
}[] = [
  { key: "deluxe_hotels", label: "Deluxe Hotels", room_category: "Deluxe" },
  { key: "super_deluxe_hotels", label: "Super Deluxe Hotels", room_category: "Super Deluxe" },
  { key: "heritage_hotels", label: "Heritage Hotels", room_category: "Heritage" },
  { key: "luxury_hotels", label: "Luxury Hotels", room_category: "Luxury" },
];

export const CLIENT_TITLES = [
  "Mr",
  "Ms",
  "Mrs",
  "Miss",
  "Dr",
  "Prof",
  "Rev",
  "Hon",
  "Mx",
  "Sir",
  "Madam",
  "Master",
  "Capt",
  "Col",
  "Maj",
  "Lt",
  "Engr",
  "Er",
  "Adv",
  "CA",
  "CPA",
] as const;

export interface CategoryPricingTier {
  category_key: HotelCategoryKey;
  label: string;
  room_category: string;
  package_price: number;
  discount_price: number | null;
  /** V1 booking amount field (advance / deposit) */
  booking_amount: number | null;
  grand_total: number;
  manual_override: number | null;
}

export interface CategoryTotalSummary {
  category_key: HotelCategoryKey;
  label: string;
  grand_total: number;
}

export interface DayActivity {
  activity_uuid: string;
  sort_order: number;
  title: string;
  description: string;
  start_time: string | null;
  end_time: string | null;
  entry_fee: number;
  guide_required: boolean;
}

export interface ItineraryDay {
  day_uuid: string;
  day_number: number;
  day_title: string;
  /** Extra day titles (V1 “Add Title” on day card) */
  alternate_day_titles: string[];
  day_subtitle: string | null;
  day_theme: string | null;
  day_description: string;
  start_time: string | null;
  end_time: string | null;
  travel_distance_km: number | null;
  travel_time_minutes: number | null;
  /** Primary city / location for the day (V1 Locations) */
  location: string | null;
  hotel_name: string | null;
  room_category: string | null;
  meal_plan: string | null;
  breakfast: boolean;
  lunch: boolean;
  dinner: boolean;
  /** V1 night meal hotel picks (up to 2 each) */
  breakfast_hotels: [string | null, string | null];
  lunch_hotels: [string | null, string | null];
  dinner_hotels: [string | null, string | null];
  epai_plan_only: boolean;
  guest_self_booked_hotel: boolean;
  vehicle_type: string | null;
  pickup_location: string | null;
  drop_location: string | null;
  guide_required: boolean;
  activities: DayActivity[];
  images: string[];
  internal_notes: string;
  client_notes: string;
  operations_notes: string;
  status: DayStatus;
  completion_pct: number;
  packing_tips: string;
  things_to_carry: string[];
}

export type PriceBasis = "per_person" | "whole_group";

export interface CostLineItem {
  id: string;
  day_number: number | null;
  category: CostLineCategory;
  description: string;
  quantity: number;
  unit_cost: number;
  total: number;
}

export interface CostSheet {
  currency: string;
  line_items: CostLineItem[];
  subtotal: number;
  markup_total: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  net_profit: number;
  margin_pct: number;
}

export interface ClientDetails {
  title: string;
  client_name: string;
  email: string | null;
  email2: string | null;
  phone: string | null;
  adults: number | null;
  children_5_12: number | null;
  children_below_5: number | null;
  rooms: number | null;
  extra_beds: number | null;
  travel_date: string | null;
  food_preference: string | null;
  special_requests: string | null;
}

export interface ItinerarySnapshot {
  header: {
    title: string;
    subtitle: string | null;
    tour_code: string | null;
    duration_label: string | null;
    /** Extra titles / aliases (V1 “Add Title”) */
    alternate_titles: string[];
  };
  client: ClientDetails;
  days: ItineraryDay[];
  inclusions: string[];
  exclusions: string[];
  /** Rich inclusion cards for Preview & Confirm (V1) */
  inclusion_items: {
    id: string;
    title: string;
    description: string;
    images: string[];
  }[];
  exclusion_items: {
    id: string;
    title: string;
    description: string;
    images: string[];
  }[];
  terms: string;
  internal_notes: string;
  public_notes: string;
  /** Up to 2 hotel tiers with prefetched + editable pricing (V1 Step 3) */
  category_pricing: CategoryPricingTier[];
  source_package_id: string | null;
  cost_sheet: CostSheet;
  /** Booking-level vehicle (legacy single; prefer vehicle_types) */
  vehicle_type: string | null;
  /** V1 multi-vehicle selection chips */
  vehicle_types: string[];
  price_basis: PriceBasis;
  final_price: number | null;
  /** Keys of selected optional inclusions (V1 checklist) */
  optional_inclusion_keys: string[];
  /** Preview & Confirm heritage theme 1–5 */
  preview_theme: 1 | 2 | 3 | 4 | 5;
  /** Advance deposit as % of package total (admin/agent selectable) */
  advance_percent: 20 | 30;
  selected_contact_id: string | null;
}

export interface ItineraryRevision {
  id: string;
  itinerary_id: string;
  version_number: number;
  parent_revision_id: string | null;
  milestone_label: string | null;
  change_summary: string | null;
  save_type: RevisionSaveType;
  snapshot: ItinerarySnapshot;
  created_by: string;
  created_at: string;
}

export interface ClientItineraryRecord {
  id: string;
  quote_id: string;
  type: "client_itinerary";
  title: string;
  tour_code: string | null;
  workflow_status: WorkflowStatus;
  current_revision_id: string;
  current_version: number;
  created_by: string;
  owner_name: string;
  created_at: string;
  updated_at: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  travel_date: string | null;
  adults: number;
  children: number;
  rooms: number;
  grand_total: number;
  /** Multi-tier totals shown on list (V1 grand total column) */
  category_totals: CategoryTotalSummary[];
  currency: string;
  margin_pct: number;
  payment_status: PaymentStatus;
  amount_paid: number;
  deleted_at: string | null;
  source_package_id: string | null;
  /** CRM lead link when created from inquiry/WhatsApp/contact */
  lead_id: string | null;
  lead_source: "website_inquiry" | "whatsapp" | "contact" | "email" | null;
  /** Linked CRM customer (auto-created on lead convert / wizard) */
  customer_id: string | null;
}

export const WORKFLOW_LABELS: Record<WorkflowStatus, string> = {
  draft: "Draft",
  sales_review: "Sales Review",
  manager_approval: "Manager Approval",
  accounts: "Accounts",
  operations: "Operations",
  client_shared: "Client Shared",
  client_approved: "Client Approved",
  booking_confirmed: "Booking Confirmed",
  completed: "Completed",
  archived: "Archived",
};

export const WORKFLOW_PIPELINE: WorkflowStatus[] = [
  "draft",
  "sales_review",
  "manager_approval",
  "accounts",
  "operations",
  "client_shared",
  "client_approved",
  "booking_confirmed",
  "completed",
];

export type DocumentType = "quotation" | "proposal" | "voucher";

export interface ItineraryShareLink {
  token: string;
  itinerary_id: string;
  revision_id: string;
  quote_id: string;
  version_number: number;
  snapshot: ItinerarySnapshot;
  client_name: string;
  pin: string | null;
  expires_at: string | null;
  created_at: string;
  created_by: string;
  view_count: number;
  accepted_at: string | null;
  accepted_by_name: string | null;
}

export interface GeneratedDocument {
  id: string;
  itinerary_id: string;
  revision_id: string;
  quote_id: string;
  type: DocumentType;
  version_number: number;
  created_at: string;
  created_by: string;
}
