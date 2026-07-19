import type {
  BookingExpenses,
  ExpenseLine,
  HotelCostRow,
  OperationCostSheet,
  OperationsState,
  OpsInvoice,
  PaymentEntry,
  PaymentEntryStatus,
  TransportAssignment,
} from "@/types/operations";
import type {
  ClientItineraryRecord,
  ItinerarySnapshot,
  PaymentStatus,
} from "@/types/itinerary-builder";
import {
  getClientItinerary,
  getCurrentSnapshot,
  listClientItineraries,
  updatePaymentStatus,
} from "@/lib/itinerary-builder/storage";

const STORAGE_KEY = "td-operations-v1";

function emptyState(): OperationsState {
  return { transports: {}, cost_sheets: {}, expenses: {}, invoices: [], payments: {} };
}

function readState(): OperationsState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as OperationsState;
    return {
      transports: parsed.transports ?? {},
      cost_sheets: parsed.cost_sheets ?? {},
      expenses: parsed.expenses ?? {},
      invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
      payments: parsed.payments ?? {},
    };
  } catch {
    return emptyState();
  }
}

function writeState(state: OperationsState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function listConfirmedBookings(): ClientItineraryRecord[] {
  return listClientItineraries({ confirmedOnly: true });
}

export function getTransport(itineraryId: string): TransportAssignment | null {
  return readState().transports[itineraryId] ?? null;
}

export function upsertTransport(
  itineraryId: string,
  patch: Partial<Omit<TransportAssignment, "itinerary_id" | "updated_at">>
): TransportAssignment {
  const state = readState();
  const prev = state.transports[itineraryId];
  const next: TransportAssignment = {
    itinerary_id: itineraryId,
    driver_name: patch.driver_name ?? prev?.driver_name ?? "",
    driver_phone: patch.driver_phone ?? prev?.driver_phone ?? "",
    vehicle_id: patch.vehicle_id !== undefined ? patch.vehicle_id : (prev?.vehicle_id ?? null),
    vehicle_name: patch.vehicle_name ?? prev?.vehicle_name ?? "",
    vehicle_number: patch.vehicle_number ?? prev?.vehicle_number ?? "",
    vehicle_type: patch.vehicle_type ?? prev?.vehicle_type ?? "",
    vehicle_model: patch.vehicle_model ?? prev?.vehicle_model ?? "",
    pickup_location: patch.pickup_location ?? prev?.pickup_location ?? "",
    dropoff_location: patch.dropoff_location ?? prev?.dropoff_location ?? "",
    trip_end_date: patch.trip_end_date !== undefined ? patch.trip_end_date : (prev?.trip_end_date ?? null),
    driver_advance: patch.driver_advance ?? prev?.driver_advance ?? 0,
    updated_at: new Date().toISOString(),
  };
  state.transports[itineraryId] = next;
  writeState(state);
  return next;
}

function dayDateLabel(travelDate: string | null, dayNumber: number): string {
  if (!travelDate) return `Day ${dayNumber}`;
  const base = new Date(travelDate);
  if (Number.isNaN(base.getTime())) return `Day ${dayNumber}`;
  base.setDate(base.getDate() + Math.max(0, dayNumber - 1));
  return formatDisplayDate(base.toISOString());
}

function hotelRowsFromSnapshot(snapshot: ItinerarySnapshot | null): HotelCostRow[] {
  if (!snapshot) return [];
  return snapshot.days.map((day, i) => ({
    id: day.day_uuid || `day-${i}`,
    date: dayDateLabel(snapshot.client.travel_date, day.day_number),
    place: day.location || day.day_title || "",
    hotel_name: day.hotel_name || "",
    room_price: 0,
    room_count: snapshot.client.rooms || 1,
    extra_bed_count: 0,
    extra_bed_price: 0,
    notes: "",
    status: "original" as const,
  }));
}

export function getOrCreateCostSheet(itineraryId: string): OperationCostSheet {
  const state = readState();
  const existing = state.cost_sheets[itineraryId];
  if (existing) return existing;

  const record = listConfirmedBookings().find((r) => r.id === itineraryId);
  const snapshot = getCurrentSnapshot(itineraryId);
  const sheet: OperationCostSheet = {
    itinerary_id: itineraryId,
    hotel_rows: hotelRowsFromSnapshot(snapshot),
    total_vehicle_km: 0,
    price_per_km: 0,
    additional_charges: 0,
    pax: record ? record.adults + record.children : snapshot?.client.adults ?? 0,
    updated_at: new Date().toISOString(),
  };
  state.cost_sheets[itineraryId] = sheet;
  writeState(state);
  return sheet;
}

export function saveCostSheet(sheet: OperationCostSheet): OperationCostSheet {
  const state = readState();
  const next = { ...sheet, updated_at: new Date().toISOString() };
  state.cost_sheets[sheet.itinerary_id] = next;
  writeState(state);
  return next;
}

export function hasCostSheet(itineraryId: string): boolean {
  return Boolean(readState().cost_sheets[itineraryId]);
}

export function getExpenses(itineraryId: string): BookingExpenses {
  const existing = readState().expenses[itineraryId];
  if (existing) return existing;
  return { itinerary_id: itineraryId, lines: [], updated_at: new Date().toISOString() };
}

export function saveExpenses(itineraryId: string, lines: ExpenseLine[]): BookingExpenses {
  const state = readState();
  const next: BookingExpenses = {
    itinerary_id: itineraryId,
    lines,
    updated_at: new Date().toISOString(),
  };
  state.expenses[itineraryId] = next;
  writeState(state);
  return next;
}

export function expenseTotal(itineraryId: string): number {
  return getExpenses(itineraryId).lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
}

export function listInvoices(): OpsInvoice[] {
  return [...readState().invoices].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export function getInvoice(id: string): OpsInvoice | null {
  return readState().invoices.find((i) => i.id === id) ?? null;
}

export function saveInvoice(invoice: OpsInvoice): OpsInvoice {
  const state = readState();
  const next = { ...invoice, updated_at: new Date().toISOString() };
  const idx = state.invoices.findIndex((i) => i.id === invoice.id);
  if (idx >= 0) state.invoices[idx] = next;
  else state.invoices.unshift(next);
  writeState(state);
  return next;
}

export function deleteInvoice(id: string) {
  const state = readState();
  state.invoices = state.invoices.filter((i) => i.id !== id);
  writeState(state);
}

export function emptyParty() {
  return {
    name: "",
    address: "",
    phone: "",
    email: "",
    gstin: "",
    state: "Rajasthan",
    district: "Jaipur",
  };
}

export function nextInvoiceNumber(kind: OpsInvoice["kind"]): string {
  const prefix = kind === "sales" ? "RT" : kind === "car_rental" ? "RTC" : "QT";
  const count = readState().invoices.filter((i) => i.kind === kind).length + 1;
  return `${prefix}-${String(count).padStart(5, "0")}`;
}

export function hotelRowTotal(row: HotelCostRow): number {
  return row.room_price * row.room_count + row.extra_bed_price * row.extra_bed_count;
}

export function costSheetTotals(sheet: OperationCostSheet) {
  const hotel = sheet.hotel_rows
    .filter((r) => r.status !== "removed")
    .reduce((s, r) => s + hotelRowTotal(r), 0);
  const vehicle = sheet.total_vehicle_km * sheet.price_per_km;
  const additional = sheet.additional_charges;
  return { hotel, vehicle, additional, grand: hotel + vehicle + additional };
}

export function formatDisplayDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    // already dd-mm-yyyy style
    if (/^\d{2}-\d{2}-\d{4}/.test(iso)) return iso.slice(0, 10);
    return iso;
  }
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function addDaysIso(days: number, from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/* ── Payment Manager ledger ─────────────────────────────────────────── */

export function listPayments(itineraryId: string): PaymentEntry[] {
  return [...(readState().payments[itineraryId] ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/** Flat payment ledger across all bookings (newest first). */
export function listAllPayments(): PaymentEntry[] {
  const payments = readState().payments;
  return Object.values(payments)
    .flat()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function paymentLedgerTotal(itineraryId: string, onlySuccess = true): number {
  return listPayments(itineraryId)
    .filter((p) => (onlySuccess ? p.status === "success" : p.status !== "failed"))
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

function derivePaymentStatus(grandTotal: number, amountPaid: number): PaymentStatus {
  if (amountPaid <= 0) return "unpaid";
  if (grandTotal > 0 && amountPaid >= grandTotal) return "paid";
  return "partial";
}

function syncItineraryPaymentTotals(itineraryId: string) {
  const record = getClientItinerary(itineraryId);
  if (!record) return;
  const entries = listPayments(itineraryId);
  if (entries.length === 0) return;
  const amountPaid = paymentLedgerTotal(itineraryId, true);
  updatePaymentStatus(
    itineraryId,
    derivePaymentStatus(record.grand_total, amountPaid),
    amountPaid
  );
}

export function addPayment(
  itineraryId: string,
  input: {
    amount: number;
    method: string;
    gateway?: string;
    status: PaymentEntryStatus;
    receipt_url?: string;
    screenshot_data_url?: string | null;
    mobile?: string;
    transaction_id?: string;
  }
): PaymentEntry {
  const state = readState();
  const now = new Date().toISOString();
  const entry: PaymentEntry = {
    id: crypto.randomUUID(),
    itinerary_id: itineraryId,
    amount: Number(input.amount) || 0,
    method: input.method.trim() || "UPI",
    gateway: (input.gateway ?? "").trim(),
    status: input.status,
    receipt_url: (input.receipt_url ?? "").trim(),
    screenshot_data_url: input.screenshot_data_url ?? null,
    mobile: (input.mobile ?? "").trim(),
    transaction_id: (input.transaction_id ?? "").trim(),
    created_at: now,
    updated_at: now,
  };
  const list = state.payments[itineraryId] ?? [];
  state.payments[itineraryId] = [entry, ...list];
  writeState(state);
  syncItineraryPaymentTotals(itineraryId);
  return entry;
}

export function updatePayment(
  itineraryId: string,
  paymentId: string,
  patch: Partial<
    Pick<
      PaymentEntry,
      | "amount"
      | "method"
      | "gateway"
      | "status"
      | "receipt_url"
      | "screenshot_data_url"
      | "mobile"
      | "transaction_id"
    >
  >
): PaymentEntry | null {
  const state = readState();
  const list = state.payments[itineraryId] ?? [];
  const idx = list.findIndex((p) => p.id === paymentId);
  if (idx < 0) return null;
  const next: PaymentEntry = {
    ...list[idx],
    ...patch,
    amount: patch.amount !== undefined ? Number(patch.amount) || 0 : list[idx].amount,
    updated_at: new Date().toISOString(),
  };
  list[idx] = next;
  state.payments[itineraryId] = list;
  writeState(state);
  syncItineraryPaymentTotals(itineraryId);
  return next;
}

export function deletePayment(itineraryId: string, paymentId: string): boolean {
  const state = readState();
  const list = state.payments[itineraryId] ?? [];
  const next = list.filter((p) => p.id !== paymentId);
  if (next.length === list.length) return false;
  state.payments[itineraryId] = next;
  writeState(state);
  syncItineraryPaymentTotals(itineraryId);
  return true;
}
