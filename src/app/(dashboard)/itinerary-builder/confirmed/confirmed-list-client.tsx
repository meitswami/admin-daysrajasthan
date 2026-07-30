"use client";

import { ItineraryBuilderPipelineView } from "@/components/itinerary-builder/pipeline-view";
import type { ClientItineraryRecord } from "@/types/itinerary-builder";

export function ConfirmedListClient({ initial }: { initial: ClientItineraryRecord[] }) {
  return (
    <ItineraryBuilderPipelineView
      initialRecords={initial}
      title="Confirmed bookings"
      listFilter="confirmed"
    />
  );
}
