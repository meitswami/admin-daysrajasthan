import type { ClientItineraryRecord, WorkflowStatus } from "@/types/itinerary-builder";
import { isInDashboardPeriod, type DashboardPeriod } from "@/lib/utils/date-range";
import { listClientItineraries } from "./storage";

export type ItineraryBuilderMetrics = {
  totalQuotes: number;
  pendingQuotes: number;
  confirmedQuotes: number;
  totalBookingValue: number;
  totalRevenue: number;
  unpaidQuotes: number;
  activePackages: number;
};

const PENDING_STATUSES: WorkflowStatus[] = [
  "draft",
  "sales_review",
  "manager_approval",
  "accounts",
  "operations",
  "client_shared",
  "client_approved",
];

const CONFIRMED_STATUSES: WorkflowStatus[] = ["booking_confirmed", "completed"];

/** Website package catalog rows are not client bookings / quotes. */
function isClientBookingQuote(record: ClientItineraryRecord): boolean {
  const name = (record.client_name ?? "").trim().toLowerCase();
  if (name === "website package" || name === "") return false;
  return true;
}

function aggregate(records: ClientItineraryRecord[]): ItineraryBuilderMetrics {
  const active = records.filter((r) => !r.deleted_at && isClientBookingQuote(r));
  const pending = active.filter((r) => PENDING_STATUSES.includes(r.workflow_status));
  const confirmed = active.filter((r) => CONFIRMED_STATUSES.includes(r.workflow_status));

  return {
    totalQuotes: active.length,
    pendingQuotes: pending.length,
    confirmedQuotes: confirmed.length,
    totalBookingValue: active.reduce((s, r) => s + r.grand_total, 0),
    totalRevenue: confirmed.reduce((s, r) => s + r.grand_total, 0),
    unpaidQuotes: active.filter((r) => r.payment_status !== "paid").length,
    activePackages: new Set(active.map((r) => r.tour_code).filter(Boolean)).size,
  };
}

function filterByPeriod(
  records: ClientItineraryRecord[],
  period: DashboardPeriod,
  custom?: { from?: string; to?: string }
) {
  return records.filter((r) => isInDashboardPeriod(r.created_at, period, new Date(), custom));
}

/** Server / initial render — never seed dummy quotes into the dashboard */
export function getItineraryBuilderMetricsFromSeed(
  period: DashboardPeriod = "all",
  custom?: { from?: string; to?: string }
): ItineraryBuilderMetrics {
  void period;
  void custom;
  return {
    totalQuotes: 0,
    pendingQuotes: 0,
    confirmedQuotes: 0,
    totalBookingValue: 0,
    totalRevenue: 0,
    unpaidQuotes: 0,
    activePackages: 0,
  };
}

/** Client — live quotes only (excludes website package catalog rows) */
export function getItineraryBuilderMetricsLive(
  period: DashboardPeriod = "all",
  custom?: { from?: string; to?: string }
): ItineraryBuilderMetrics {
  if (typeof window === "undefined") return getItineraryBuilderMetricsFromSeed(period, custom);
  return aggregate(filterByPeriod(listClientItineraries(), period, custom));
}

export function formatInrCompact(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}k`;
  return `₹${amount.toLocaleString("en-IN")}`;
}
