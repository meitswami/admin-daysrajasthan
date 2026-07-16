"use client";

import { useEffect, useState } from "react";
import { ItineraryBuilderPipelineView } from "@/components/itinerary-builder/pipeline-view";
import { listClientItineraries } from "@/lib/itinerary-builder/storage";
import type { ClientItineraryRecord } from "@/types/itinerary-builder";

export function ConfirmedListClient({ initial }: { initial: ClientItineraryRecord[] }) {
  const [records, setRecords] = useState(initial);

  useEffect(() => {
    setRecords(listClientItineraries({ confirmedOnly: true }));
  }, []);

  return <ItineraryBuilderPipelineView initialRecords={records} title="Confirmed bookings" />;
}
