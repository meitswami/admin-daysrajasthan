import { packageInquiries } from "@/lib/data";
import { listMessages } from "@/lib/email/storage";
import { formatInr } from "@/lib/itinerary-builder/cost-engine";
import { listClientItineraries } from "@/lib/itinerary-builder/storage";
import { listAllPayments } from "@/lib/operations/store";
import { formatDate } from "@/lib/utils";
import type { PackageInquiry } from "@/types/database";
import {
  WORKFLOW_LABELS,
  type ClientItineraryRecord,
  type WorkflowStatus,
} from "@/types/itinerary-builder";
import type { PaymentEntry, PaymentEntryStatus } from "@/types/operations";
import type { EmailDeliveryStatus } from "@/types/team-email";

const CONFIRMED: WorkflowStatus[] = ["booking_confirmed", "completed"];

export type BookingReportRow = {
  id: string;
  booking_id: string;
  client_name: string;
  email: string;
  package_name: string;
  amount: number;
  amount_label: string;
  status: string;
  status_key: string;
};

export type PaymentReportRow = {
  id: string;
  booking_id: string;
  client_name: string;
  amount: number;
  amount_label: string;
  status: PaymentEntryStatus | "paid" | "partial" | "unpaid";
  method: string;
  date: string;
  date_raw: string;
};

export type InquiryReportRow = {
  id: string;
  customer_name: string;
  email: string;
  package_name: string;
  amount_label: string;
  status: string;
  travel_date: string;
};

export type OptionalItineraryRow = {
  id: string;
  booking_id: string;
  client_name: string;
  email: string;
  package_name: string;
  amount: number;
  amount_label: string;
  status: string;
  status_key: string;
};

export type EmailReportRow = {
  id: string;
  booking_id: string;
  client_name: string;
  email: string;
  subject: string;
  status: EmailDeliveryStatus | string;
  date: string;
  date_raw: string;
};

function bookingStatusLabel(status: WorkflowStatus): string {
  if (status === "booking_confirmed") return "Booked";
  if (status === "completed") return "Completed";
  return WORKFLOW_LABELS[status];
}

function mapBooking(r: ClientItineraryRecord): BookingReportRow {
  return {
    id: r.id,
    booking_id: r.quote_id,
    client_name: r.client_name,
    email: r.client_email ?? "—",
    package_name: r.title,
    amount: r.grand_total ?? 0,
    amount_label: formatInr(r.grand_total ?? 0),
    status: bookingStatusLabel(r.workflow_status),
    status_key: r.workflow_status === "booking_confirmed" ? "Booked" : r.workflow_status,
  };
}

export function getBookingReportRows(): BookingReportRow[] {
  return listClientItineraries({ confirmedOnly: true }).map(mapBooking);
}

export function getOptionalItineraryRows(): OptionalItineraryRow[] {
  return listClientItineraries()
    .filter((r) => !CONFIRMED.includes(r.workflow_status) && r.workflow_status !== "archived")
    .map((r) => ({
      id: r.id,
      booking_id: r.quote_id,
      client_name: r.client_name,
      email: r.client_email ?? "—",
      package_name: r.title,
      amount: r.grand_total ?? 0,
      amount_label: formatInr(r.grand_total ?? 0),
      status: WORKFLOW_LABELS[r.workflow_status],
      status_key: "pending",
    }));
}

function paymentFromLedger(
  entry: PaymentEntry,
  record: ClientItineraryRecord | undefined
): PaymentReportRow {
  return {
    id: entry.id,
    booking_id: record?.quote_id ?? "—",
    client_name: record?.client_name ?? "—",
    amount: entry.amount,
    amount_label: formatInr(entry.amount),
    status: entry.status,
    method: entry.method || "—",
    date: formatDate(entry.created_at),
    date_raw: entry.created_at,
  };
}

/** Prefer Payment Manager ledger; fall back to itinerary payment totals. */
export function getPaymentReportRows(): PaymentReportRow[] {
  const itineraries = listClientItineraries({ includeDeleted: true });
  const byId = new Map(itineraries.map((r) => [r.id, r]));
  const ledger = listAllPayments();

  if (ledger.length > 0) {
    return ledger.map((p) => paymentFromLedger(p, byId.get(p.itinerary_id)));
  }

  return itineraries
    .filter((r) => r.amount_paid > 0 || r.payment_status !== "unpaid")
    .map((r) => ({
      id: `synth-${r.id}`,
      booking_id: r.quote_id,
      client_name: r.client_name,
      amount: r.amount_paid,
      amount_label: formatInr(r.amount_paid),
      status: r.payment_status === "paid" ? "success" : r.payment_status === "partial" ? "partial" : "pending",
      method: "—",
      date: formatDate(r.updated_at),
      date_raw: r.updated_at,
    }));
}

export function getInquiryReportRows(source?: PackageInquiry[]): InquiryReportRow[] {
  const items = source ?? packageInquiries;
  return items.map((r) => ({
    id: r.id,
    customer_name: r.customer_name,
    email: r.email,
    package_name: r.destination ?? "—",
    amount_label: r.budget ?? "—",
    status: r.status,
    travel_date: r.travel_date ? formatDate(r.travel_date) : "—",
  }));
}

export async function getEmailReportRows(): Promise<EmailReportRow[]> {
  const messages = await listMessages();
  return messages
    .filter((m) => m.folder !== "spam")
    .map((m) => ({
      id: m.id,
      booking_id: m.quote_id ?? "—",
      client_name: m.to_name ?? m.from_name ?? m.to_email,
      email: m.folder === "inbox" ? m.from_email : m.to_email,
      subject: m.subject,
      status: m.delivery_status,
      date: formatDate(m.sent_at ?? m.created_at),
      date_raw: m.sent_at ?? m.created_at,
    }));
}

export const REPORT_TAB_META = {
  bookings: {
    title: "Bookings Report",
    description: "Confirmed bookings ready for operations",
    empty: "No confirmed bookings yet",
    noun: "bookings",
    searchPlaceholder: "Search by name, email, or booking ID…",
  },
  payments: {
    title: "Payments Report",
    description: "Payment ledger across bookings",
    empty: "No payment records found",
    noun: "payment records",
    searchPlaceholder: "Search by name, email, or booking ID…",
  },
  inquiries: {
    title: "Inquiries Report",
    description: "Website package inquiry submissions",
    empty: "No inquiries found",
    noun: "inquiries",
    searchPlaceholder: "Search by name, email, or package…",
  },
  optional: {
    title: "Optional Itinerary Report",
    description: "Pending quotes and optional itineraries",
    empty: "No optional itineraries found",
    noun: "itineraries",
    searchPlaceholder: "Search by name, email, or booking ID…",
  },
  emails: {
    title: "Emails Report",
    description: "Booking email tracking records",
    empty: "No emails found",
    noun: "emails",
    searchPlaceholder: "Search by name, email, or booking ID…",
  },
} as const;

export type ReportTabId = keyof typeof REPORT_TAB_META;
