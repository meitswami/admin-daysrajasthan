import { PreviewConfirmView } from "@/components/itinerary-builder/preview-confirm-view";

type Props = { params: Promise<{ id: string }> };

export default async function PreviewConfirmPage({ params }: Props) {
  const { id } = await params;
  return <PreviewConfirmView itineraryId={id} />;
}
