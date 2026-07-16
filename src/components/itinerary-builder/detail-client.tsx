"use client";

import { notFound } from "next/navigation";
import { useEffect, useState } from "react";
import { ItineraryBuilderWorkspace } from "@/components/itinerary-builder/builder-workspace";
import {
  SEED_ITINERARY_RECORDS,
  SEED_REVISIONS,
} from "@/lib/data/itinerary-builder-mock";
import {
  getClientItinerary,
  getRevisions,
} from "@/lib/itinerary-builder/storage";
import { normalizeRecord, normalizeRevision } from "@/lib/itinerary-builder/normalize";
import type { ClientItineraryRecord, ItineraryRevision } from "@/types/itinerary-builder";

export function ItineraryBuilderDetailClient({ id }: { id: string }) {
  const [ready, setReady] = useState(false);
  const [record, setRecord] = useState<ClientItineraryRecord | null>(null);
  const [revisions, setRevisions] = useState<ItineraryRevision[]>([]);

  useEffect(() => {
    async function load() {
      let fromStorage = getClientItinerary(id);
      let revs = getRevisions(id);

      const { isRealDataMode } = await import("@/lib/system/data-mode");
      if (isRealDataMode() && (!fromStorage || !revs.length)) {
        const { pullRevisionsFromSupabaseIfReal } = await import(
          "@/lib/itinerary-builder/sync-real"
        );
        await pullRevisionsFromSupabaseIfReal(id);
        fromStorage = getClientItinerary(id);
        revs = getRevisions(id);
      }

      if (fromStorage && revs.length) {
        setRecord(normalizeRecord(fromStorage));
        setRevisions(revs.map(normalizeRevision));
        setReady(true);
        return;
      }

      if (!isRealDataMode()) {
        const seed = SEED_ITINERARY_RECORDS.find((r) => r.id === id);
        const seedRevs = (SEED_REVISIONS[id] ?? []).map(normalizeRevision);
        if (seed && seedRevs.length) {
          setRecord(normalizeRecord(seed));
          setRevisions(seedRevs);
        }
      }

      setReady(true);
    }

    void load();
  }, [id]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-stone-500">
        Loading itinerary builder…
      </div>
    );
  }

  if (!record || !revisions.length) notFound();

  return (
    <ItineraryBuilderWorkspace
      itineraryId={id}
      initialRecord={record}
      initialRevisions={revisions}
    />
  );
}
