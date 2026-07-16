"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { ItineraryListTable } from "@/components/itinerary-builder/itinerary-list-table";
import { listClientItineraries } from "@/lib/itinerary-builder/storage";
import type { ClientItineraryRecord } from "@/types/itinerary-builder";

export default function TrashPage() {
  const [records, setRecords] = useState<ClientItineraryRecord[]>([]);

  useEffect(() => {
    setRecords(listClientItineraries({ includeDeleted: true }).filter((r) => r.deleted_at));
  }, []);

  function refresh() {
    setRecords(listClientItineraries({ includeDeleted: true }).filter((r) => r.deleted_at));
  }

  return (
    <>
      <Header title="Trash" description="Deleted itineraries" />
      <div className="px-4 pb-8 sm:px-6">
        <ItineraryListTable records={records} onRefresh={refresh} showTrashAction={false} />
      </div>
    </>
  );
}
