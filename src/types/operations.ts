/** Ops modules — transportation, cost sheets, P&L, invoices */

export type TransportAssignment = {
  itinerary_id: string;
  driver_name: string;
  driver_phone: string;
  vehicle_id: string | null;
  vehicle_name: string;
  vehicle_number: string;
  vehicle_type: string;
  vehicle_model: string;
  pickup_location: string;
  dropoff_location: string;
  trip_end_date: string | null;
  driver_advance: number;
  updated_at: string;
};

export type HotelCostRow = {
  id: string;
  date: string;
  place: string;
  hotel_name: string;
  room_price: number;
  room_count: number;
  extra_bed_count: number;
  extra_bed_price: number;
  notes: string;
  status: "original" | "manual" | "updated" | "removed";
};

export type OperationCostSheet = {
  itinerary_id: string;
  hotel_rows: HotelCostRow[];
  total_vehicle_km: number;
  price_per_km: number;
  additional_charges: number;
  pax: number;
  updated_at: string;
};

export type ExpenseLine = {
  id: string;
  label: string;
  amount: number;
};

export type BookingExpenses = {
  itinerary_id: string;
  lines: ExpenseLine[];
  updated_at: string;
};

export type InvoiceKind = "sales" | "car_rental" | "quotation";

export type InvoiceParty = {
  name: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  state: string;
  district: string;
};

export type InvoiceServiceLine = {
  id: string;
  tour_code: string;
  itinerary_name: string;
  travel_date: string;
  description: string;
  pax: number;
  amount: number;
};

export type TripLeg = {
  id: string;
  pickup: string;
  drop: string;
  km: number;
};

export type OpsInvoice = {
  id: string;
  kind: InvoiceKind;
  number: string;
  date: string;
  due_date: string;
  agency: InvoiceParty;
  client: InvoiceParty;
  logo_data_url: string | null;
  services: InvoiceServiceLine[];
  notes: string;
  terms: string;
  gst_rate: number;
  total_paid: number;
  /** Car rental extras */
  driver_license?: string;
  vehicle_number?: string;
  aadhaar_name?: string;
  vehicle_name?: string;
  trip_legs?: TripLeg[];
  rental_amount?: number;
  bank_name?: string;
  account_number?: string;
  ifsc?: string;
  status: "draft" | "pending" | "paid";
  created_at: string;
  updated_at: string;
};

/** Ledger line recorded in Payment Manager */
export type PaymentEntryStatus = "pending" | "success" | "failed";

export type PaymentEntry = {
  id: string;
  itinerary_id: string;
  amount: number;
  method: string;
  gateway: string;
  status: PaymentEntryStatus;
  receipt_url: string;
  screenshot_data_url: string | null;
  mobile: string;
  transaction_id: string;
  created_at: string;
  updated_at: string;
};

export type OperationsState = {
  transports: Record<string, TransportAssignment>;
  cost_sheets: Record<string, OperationCostSheet>;
  expenses: Record<string, BookingExpenses>;
  invoices: OpsInvoice[];
  /** Payment Manager ledger keyed by itinerary id */
  payments: Record<string, PaymentEntry[]>;
};
