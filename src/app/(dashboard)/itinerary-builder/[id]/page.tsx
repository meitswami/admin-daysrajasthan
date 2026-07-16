import { ItineraryBuilderDetailClient } from "@/components/itinerary-builder/detail-client";

type Props = { params: Promise<{ id: string }> };

export default async function ItineraryBuilderDetailPage({ params }: Props) {
  const { id } = await params;
  return <ItineraryBuilderDetailClient id={id} />;
}
