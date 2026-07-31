import { Header } from "@/components/layout/header";
import { PreviewConfirmView } from "@/components/itinerary-builder/preview-confirm-view";

export default function NewItineraryPreviewConfirmPage() {
  return (
    <>
      <Header
        title="Preview & Confirm"
        description="Review the unsaved draft — it is added to the Itinerary List only when you save."
      />
      <PreviewConfirmView draftMode />
    </>
  );
}
