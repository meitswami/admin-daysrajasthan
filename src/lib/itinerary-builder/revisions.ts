import type {
  ItineraryRevision,
  ItinerarySnapshot,
  RevisionSaveType,
} from "@/types/itinerary-builder";
import { applyCostToSnapshot } from "./cost-engine";
import { newUuid } from "./defaults";

export function summarizeChanges(
  prev: ItinerarySnapshot | null,
  next: ItinerarySnapshot
): string {
  if (!prev) return "Initial itinerary created";

  const parts: string[] = [];
  if (prev.header.title !== next.header.title) parts.push("Title updated");
  if (prev.days.length !== next.days.length) {
    parts.push(`Days: ${prev.days.length} → ${next.days.length}`);
  }
  if (prev.client.client_name !== next.client.client_name) parts.push("Client details updated");

  const prevHotelDays = prev.days.filter((d) => d.hotel_name).length;
  const nextHotelDays = next.days.filter((d) => d.hotel_name).length;
  if (prevHotelDays !== nextHotelDays) parts.push("Hotels updated");

  if (prev.cost_sheet.grand_total !== next.cost_sheet.grand_total) {
    parts.push(
      `Price ₹${prev.cost_sheet.grand_total.toLocaleString("en-IN")} → ₹${next.cost_sheet.grand_total.toLocaleString("en-IN")}`
    );
  }

  return parts.length ? parts.join("; ") : "Minor edits saved";
}

export function createRevision(input: {
  itinerary_id: string;
  version_number: number;
  parent_revision_id: string | null;
  snapshot: ItinerarySnapshot;
  save_type: RevisionSaveType;
  milestone_label?: string | null;
  created_by: string;
  previous_snapshot?: ItinerarySnapshot | null;
}): ItineraryRevision {
  const snapshot = applyCostToSnapshot(input.snapshot);
  const now = new Date().toISOString();

  return {
    id: newUuid(),
    itinerary_id: input.itinerary_id,
    version_number: input.version_number,
    parent_revision_id: input.parent_revision_id,
    milestone_label: input.milestone_label ?? null,
    change_summary: summarizeChanges(input.previous_snapshot ?? null, snapshot),
    save_type: input.save_type,
    snapshot,
    created_by: input.created_by,
    created_at: now,
  };
}

export function cloneSnapshot(snapshot: ItinerarySnapshot): ItinerarySnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as ItinerarySnapshot;
}
