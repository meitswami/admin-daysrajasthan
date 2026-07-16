import { QuotationPrintView } from "@/components/itinerary-builder/quotation-print-view";

type Props = { params: Promise<{ id: string }> };

export default async function QuotationPage({ params }: Props) {
  const { id } = await params;
  return <QuotationPrintView itineraryId={id} />;
}
