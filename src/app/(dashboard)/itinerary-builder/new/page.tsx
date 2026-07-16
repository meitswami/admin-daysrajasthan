import { Header } from "@/components/layout/header";
import { NewItineraryWizard } from "@/components/itinerary-builder/new-wizard";

export default function NewItineraryPage() {
  return (
    <>
      <Header
        title="Regular Itinerary"
        description="Step 1 — Client details · Step 2 — Select package · Step 3 — Category pricing"
      />
      <div className="px-4 pb-8 sm:px-6">
        <NewItineraryWizard />
      </div>
    </>
  );
}
