import { Header } from "@/components/layout/header";
import { ConfirmedListClient } from "./confirmed-list-client";
import { getServerItineraryBuilderSeed, isConfirmedBooking } from "@/lib/itinerary-builder/storage";

export default function ConfirmedBookingsPage() {
  const seed = getServerItineraryBuilderSeed();
  const confirmed = seed.records.filter(isConfirmedBooking);

  return (
    <>
      <Header
        title="All Confirm Booking"
        description="Bookings where the client has made an advance payment"
      />
      <ConfirmedListClient initial={confirmed} />
    </>
  );
}
