import { Header } from "@/components/layout/header";
import { ConfirmedListClient } from "./confirmed-list-client";
import { getServerItineraryBuilderSeed } from "@/lib/itinerary-builder/storage";

export default function ConfirmedBookingsPage() {
  const seed = getServerItineraryBuilderSeed();
  const confirmed = seed.records.filter((r) =>
    ["booking_confirmed", "completed"].includes(r.workflow_status)
  );

  return (
    <>
      <Header
        title="All Confirm Booking"
        description="Confirmed and completed client itineraries"
      />
      <ConfirmedListClient initial={confirmed} />
    </>
  );
}
