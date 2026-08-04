import { Header } from "@/components/layout/header";
import { ItineraryBuilderPipelineView } from "@/components/itinerary-builder/pipeline-view";

export default function ItineraryBuilderPage() {
  // Never SSR-seed dummy quotes — client hydrates from Supabase (real mode).
  return (
    <>
      <Header
        title="Itinerary List"
        description="Pending quotes without advance payment — multi-tier pricing, WhatsApp & email actions"
      />
      <ItineraryBuilderPipelineView
        initialRecords={[]}
        listFilter="pending"
      />
    </>
  );
}
