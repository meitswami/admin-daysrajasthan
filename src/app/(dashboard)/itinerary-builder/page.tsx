import { Header } from "@/components/layout/header";
import { ItineraryBuilderPipelineView } from "@/components/itinerary-builder/pipeline-view";
import { SEED_ITINERARY_RECORDS } from "@/lib/data/itinerary-builder-mock";

export default function ItineraryBuilderPage() {
  return (
    <>
      <Header
        title="Itinerary List"
        description="Pending quotes, multi-tier pricing, WhatsApp & email actions — V1 parity list"
      />
      <ItineraryBuilderPipelineView initialRecords={SEED_ITINERARY_RECORDS} />
    </>
  );
}
