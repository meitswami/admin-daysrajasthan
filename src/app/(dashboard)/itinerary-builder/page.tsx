import { Header } from "@/components/layout/header";
import { ItineraryBuilderPipelineView } from "@/components/itinerary-builder/pipeline-view";
import { SEED_ITINERARY_RECORDS } from "@/lib/data/itinerary-builder-mock";
import { isPendingQuote, normalizeRecord } from "@/lib/itinerary-builder/storage";

export default function ItineraryBuilderPage() {
  const pending = SEED_ITINERARY_RECORDS.map(normalizeRecord).filter(isPendingQuote);

  return (
    <>
      <Header
        title="Itinerary List"
        description="Pending quotes without advance payment — multi-tier pricing, WhatsApp & email actions"
      />
      <ItineraryBuilderPipelineView
        initialRecords={pending}
        listFilter="pending"
      />
    </>
  );
}
