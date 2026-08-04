import { PaymentView } from "@/components/itinerary-builder/payment-view";

type Props = {
  params: Promise<{ id: string }>;
};

/** Public client payment page — counterpart to legacy `/userpayment/:id`. */
export default async function PublicPaymentPage({ params }: Props) {
  const { id } = await params;
  return <PaymentView itineraryId={id} publicMode />;
}
