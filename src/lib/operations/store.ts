/**
 * Operations — Supabase primary. In-memory cache for the current session only.
 * Never reads/writes localStorage.
 */
import type {
  BookingExpenses,
  ExpenseLine,
  HotelCostRow,
  OperationCostSheet,
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
import { isSupabaseConfigured } from "@/lib/system/data-mode";

type OpsCache = {
  transports: Record<string, TransportAssignment>;
  cost_sheets: Record<string, OperationCostSheet>;
  expenses: Record<string, BookingExpenses>;
  invoices: OpsInvoice[];
  payments: Record<string, PaymentEntry[]>;
};

let cache: OpsCache | null = null;
let hydratePromise: Promise<void> | null = null;

function emptyCache(): OpsCache {
  return { transports: {}, cost_sheets: {}, expenses: {}, invoices: [], payments: {} };
}

async function supabase() {
  const { createClient } = await import("@/lib/supabase/client");
  return createClient();
}

function requireCloud(): void {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Operations data cannot be saved without a database.");
  }
}

function mapTransport(row: Record<string, unknown>): TransportAssignment {
  return {
    itinerary_id: String(row.itinerary_id),
    driver_name: String(row.driver_name ?? ""),
    driver_phone: String(row.driver_phone ?? ""),
    vehicle_id: (row.vehicle_id as string | null) ?? null,
    vehicle_name: String(row.vehicle_name ?? ""),
    vehicle_number: String(row.vehicle_number ?? ""),
    vehicle_type: String(row.vehicle_type ?? ""),
    vehicle_model: String(row.vehicle_model ?? ""),
    pickup_location: String(row.pickup_location ?? ""),
    dropoff_location: String(row.dropoff_location ?? ""),
    trip_end_date: (row.trip_end_date as string | null) ?? null,
    driver_advance: Number(row.driver_advance) || 0,
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function mapCostSheet(row: Record<string, unknown>): OperationCostSheet {
  return {
    itinerary_id: String(row.itinerary_id),
    hotel_rows: Array.isArray(row.hotel_rows) ? (row.hotel_rows as HotelCostRow[]) : [],
    total_vehicle_km: Number(row.total_vehicle_km) || 0,
    price_per_km: Number(row.price_per_km) || 0,
    additional_charges: Number(row.additional_charges) || 0,
    pax: Number(row.pax) || 0,
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function mapExpenses(row: Record<string, unknown>): BookingExpenses {
  return {
    itinerary_id: String(row.itinerary_id),
    lines: Array.isArray(row.lines) ? (row.lines as ExpenseLine[]) : [],
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function mapInvoice(row: Record<string, unknown>): OpsInvoice {
  return {
    id: String(row.id),
    kind: row.kind as OpsInvoice["kind"],
    number: String(row.number ?? ""),
    date: String(row.date ?? ""),
    due_date: String(row.due_date ?? ""),
    agency: (row.agency as OpsInvoice["agency"]) ?? emptyParty(),
    client: (row.client as OpsInvoice["client"]) ?? emptyParty(),
    logo_data_url: (row.logo_data_url as string | null) ?? null,
    services: Array.isArray(row.services) ? (row.services as OpsInvoice["services"]) : [],
    notes: String(row.notes ?? ""),
    terms: String(row.terms ?? ""),
    gst_rate: Number(row.gst_rate) || 0,
    total_paid: Number(row.total_paid) || 0,
    driver_license: (row.driver_license as string | undefined) ?? undefined,
    vehicle_number: (row.vehicle_number as string | undefined) ?? undefined,
    aadhaar_name: (row.aadhaar_name as string | undefined) ?? undefined,
    vehicle_name: (row.vehicle_name as string | undefined) ?? undefined,
    trip_legs: Array.isArray(row.trip_legs) ? (row.trip_legs as OpsInvoice["trip_legs"]) : undefined,
    rental_amount: row.rental_amount != null ? Number(row.rental_amount) : undefined,
    bank_name: (row.bank_name as string | undefined) ?? undefined,
    account_number: (row.account_number as string | undefined) ?? undefined,
    ifsc: (row.ifsc as string | undefined) ?? undefined,
    status: (row.status as OpsInvoice["status"]) ?? "draft",
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function mapPayment(row: Record<string, unknown>): PaymentEntry {
  return {
    id: String(row.id),
    itinerary_id: String(row.itinerary_id),
    amount: Number(row.amount) || 0,
    method: String(row.method ?? "UPI"),
    gateway: String(row.gateway ?? ""),
    status: (row.status as PaymentEntryStatus) ?? "pending",
    receipt_url: String(row.receipt_url ?? ""),
    screenshot_data_url: (row.screenshot_data_url as string | null) ?? null,
    mobile: String(row.mobile ?? ""),
    transaction_id: String(row.transaction_id ?? ""),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

/** Load all ops rows from Supabase into the session cache. */
export async function hydrateOperationsFromSupabase(): Promise<void> {
  if (!isSupabaseConfigured()) {
    cache = emptyCache();
    return;
  }
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    const sb = await supabase();
    const [t, c, e, i, p] = await Promise.all([
      sb.from("td_ops_transports").select("*"),
      sb.from("td_ops_cost_sheets").select("*"),
      sb.from("td_ops_expenses").select("*"),
      sb.from("td_ops_invoices").select("*").order("updated_at", { ascending: false }),
      sb.from("td_ops_payments").select("*").order("created_at", { ascending: false }),
    ]);
    if (t.error) throw new Error(t.error.message);
    if (c.error) throw new Error(c.error.message);
    if (e.error) throw new Error(e.error.message);
    if (i.error) throw new Error(i.error.message);
    if (p.error) throw new Error(p.error.message);

    const next = emptyCache();
    for (const row of t.data ?? []) {
      const mapped = mapTransport(row as Record<string, unknown>);
      next.transports[mapped.itinerary_id] = mapped;
    }
    for (const row of c.data ?? []) {
      const mapped = mapCostSheet(row as Record<string, unknown>);
      next.cost_sheets[mapped.itinerary_id] = mapped;
    }
    for (const row of e.data ?? []) {
      const mapped = mapExpenses(row as Record<string, unknown>);
      next.expenses[mapped.itinerary_id] = mapped;
    }
    next.invoices = (i.data ?? []).map((row) => mapInvoice(row as Record<string, unknown>));
    for (const row of p.data ?? []) {
      const mapped = mapPayment(row as Record<string, unknown>);
      const list = next.payments[mapped.itinerary_id] ?? [];
      list.push(mapped);
      next.payments[mapped.itinerary_id] = list;
    }
    cache = next;
  })().catch((err) => {
    hydratePromise = null;
    throw err;
  });
  return hydratePromise;
}

async function ensureCache(): Promise<OpsCache> {
  if (!cache) await hydrateOperationsFromSupabase();
  return cache ?? emptyCache();
}

function peekCache(): OpsCache {
  return cache ?? emptyCache();
}

export function listConfirmedBookings(): ClientItineraryRecord[] {
  return listClientItineraries({ confirmedOnly: true });
}

export function getTransport(itineraryId: string): TransportAssignment | null {
  return peekCache().transports[itineraryId] ?? null;
}

export async function upsertTransport(
  itineraryId: string,
  patch: Partial<Omit<TransportAssignment, "itinerary_id" | "updated_at">>
): Promise<TransportAssignment> {
  requireCloud();
  const state = await ensureCache();
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
  const sb = await supabase();
  const { error } = await sb.from("td_ops_transports").upsert({
    itinerary_id: next.itinerary_id,
    driver_name: next.driver_name,
    driver_phone: next.driver_phone,
    vehicle_id: next.vehicle_id,
    vehicle_name: next.vehicle_name,
    vehicle_number: next.vehicle_number,
    vehicle_type: next.vehicle_type,
    vehicle_model: next.vehicle_model,
    pickup_location: next.pickup_location,
    dropoff_location: next.dropoff_location,
    trip_end_date: next.trip_end_date,
    driver_advance: next.driver_advance,
    updated_at: next.updated_at,
  });
  if (error) throw new Error(error.message);
  state.transports[itineraryId] = next;
  cache = state;
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

export async function getOrCreateCostSheet(itineraryId: string): Promise<OperationCostSheet> {
  const state = await ensureCache();
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
  return saveCostSheet(sheet);
}

export async function saveCostSheet(sheet: OperationCostSheet): Promise<OperationCostSheet> {
  requireCloud();
  const state = await ensureCache();
  const next = { ...sheet, updated_at: new Date().toISOString() };
  const sb = await supabase();
  const { error } = await sb.from("td_ops_cost_sheets").upsert({
    itinerary_id: next.itinerary_id,
    hotel_rows: next.hotel_rows,
    total_vehicle_km: next.total_vehicle_km,
    price_per_km: next.price_per_km,
    additional_charges: next.additional_charges,
    pax: next.pax,
    updated_at: next.updated_at,
  });
  if (error) throw new Error(error.message);
  state.cost_sheets[sheet.itinerary_id] = next;
  cache = state;
  return next;
}

export function hasCostSheet(itineraryId: string): boolean {
  return Boolean(peekCache().cost_sheets[itineraryId]);
}

export function getExpenses(itineraryId: string): BookingExpenses {
  const existing = peekCache().expenses[itineraryId];
  if (existing) return existing;
  return { itinerary_id: itineraryId, lines: [], updated_at: new Date().toISOString() };
}

export async function saveExpenses(itineraryId: string, lines: ExpenseLine[]): Promise<BookingExpenses> {
  requireCloud();
  const state = await ensureCache();
  const next: BookingExpenses = {
    itinerary_id: itineraryId,
    lines,
    updated_at: new Date().toISOString(),
  };
  const sb = await supabase();
  const { error } = await sb.from("td_ops_expenses").upsert({
    itinerary_id: next.itinerary_id,
    lines: next.lines,
    updated_at: next.updated_at,
  });
  if (error) throw new Error(error.message);
  state.expenses[itineraryId] = next;
  cache = state;
  return next;
}

export function expenseTotal(itineraryId: string): number {
  return getExpenses(itineraryId).lines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
}

export function listInvoices(): OpsInvoice[] {
  return [...peekCache().invoices].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export function getInvoice(id: string): OpsInvoice | null {
  return peekCache().invoices.find((i) => i.id === id) ?? null;
}

export async function saveInvoice(invoice: OpsInvoice): Promise<OpsInvoice> {
  requireCloud();
  const state = await ensureCache();
  const next = { ...invoice, updated_at: new Date().toISOString() };
  const sb = await supabase();
  const { error } = await sb.from("td_ops_invoices").upsert({
    id: next.id,
    kind: next.kind,
    number: next.number,
    date: next.date,
    due_date: next.due_date,
    agency: next.agency,
    client: next.client,
    logo_data_url: next.logo_data_url,
    services: next.services,
    notes: next.notes,
    terms: next.terms,
    gst_rate: next.gst_rate,
    total_paid: next.total_paid,
    driver_license: next.driver_license ?? null,
    vehicle_number: next.vehicle_number ?? null,
    aadhaar_name: next.aadhaar_name ?? null,
    vehicle_name: next.vehicle_name ?? null,
    trip_legs: next.trip_legs ?? null,
    rental_amount: next.rental_amount ?? null,
    bank_name: next.bank_name ?? null,
    account_number: next.account_number ?? null,
    ifsc: next.ifsc ?? null,
    status: next.status,
    created_at: next.created_at,
    updated_at: next.updated_at,
  });
  if (error) throw new Error(error.message);
  const idx = state.invoices.findIndex((i) => i.id === invoice.id);
  if (idx >= 0) state.invoices[idx] = next;
  else state.invoices.unshift(next);
  cache = state;
  return next;
}

export async function deleteInvoice(id: string): Promise<void> {
  requireCloud();
  const state = await ensureCache();
  const sb = await supabase();
  const { error } = await sb.from("td_ops_invoices").delete().eq("id", id);
  if (error) throw new Error(error.message);
  state.invoices = state.invoices.filter((i) => i.id !== id);
  cache = state;
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
  const count = peekCache().invoices.filter((i) => i.kind === kind).length + 1;
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

export function listPayments(itineraryId: string): PaymentEntry[] {
  return [...(peekCache().payments[itineraryId] ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function listAllPayments(): PaymentEntry[] {
  return Object.values(peekCache().payments)
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

export async function addPayment(
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
): Promise<PaymentEntry> {
  requireCloud();
  const state = await ensureCache();
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
  const sb = await supabase();
  const { error } = await sb.from("td_ops_payments").insert({
    id: entry.id,
    itinerary_id: entry.itinerary_id,
    amount: entry.amount,
    method: entry.method,
    gateway: entry.gateway,
    status: entry.status,
    receipt_url: entry.receipt_url,
    screenshot_data_url: entry.screenshot_data_url,
    mobile: entry.mobile,
    transaction_id: entry.transaction_id,
    created_at: entry.created_at,
    updated_at: entry.updated_at,
  });
  if (error) throw new Error(error.message);
  const list = state.payments[itineraryId] ?? [];
  state.payments[itineraryId] = [entry, ...list];
  cache = state;
  syncItineraryPaymentTotals(itineraryId);
  return entry;
}

export async function updatePayment(
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
): Promise<PaymentEntry | null> {
  requireCloud();
  const state = await ensureCache();
  const list = state.payments[itineraryId] ?? [];
  const idx = list.findIndex((p) => p.id === paymentId);
  if (idx < 0) return null;
  const next: PaymentEntry = {
    ...list[idx],
    ...patch,
    amount: patch.amount !== undefined ? Number(patch.amount) || 0 : list[idx].amount,
    updated_at: new Date().toISOString(),
  };
  const sb = await supabase();
  const { error } = await sb
    .from("td_ops_payments")
    .update({
      amount: next.amount,
      method: next.method,
      gateway: next.gateway,
      status: next.status,
      receipt_url: next.receipt_url,
      screenshot_data_url: next.screenshot_data_url,
      mobile: next.mobile,
      transaction_id: next.transaction_id,
      updated_at: next.updated_at,
    })
    .eq("id", paymentId);
  if (error) throw new Error(error.message);
  list[idx] = next;
  state.payments[itineraryId] = list;
  cache = state;
  syncItineraryPaymentTotals(itineraryId);
  return next;
}

export async function deletePayment(itineraryId: string, paymentId: string): Promise<boolean> {
  requireCloud();
  const state = await ensureCache();
  const list = state.payments[itineraryId] ?? [];
  const next = list.filter((p) => p.id !== paymentId);
  if (next.length === list.length) return false;
  const sb = await supabase();
  const { error } = await sb.from("td_ops_payments").delete().eq("id", paymentId);
  if (error) throw new Error(error.message);
  state.payments[itineraryId] = next;
  cache = state;
  syncItineraryPaymentTotals(itineraryId);
  return true;
}
