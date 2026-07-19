import { PaymentView } from "@/components/itinerary-builder/payment-view";

type Props = { params: Promise<{ id: string }> };

export default async function PaymentPage({ params }: Props) {
  const { id } = await params;
  return <PaymentView itineraryId={id} />;
}
