import { QuotationPrintView } from "@/components/itinerary-builder/quotation-print-view";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string | string[] }>;
};

export default async function PublicQuotationPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const raw = sp.v;
  const themeToken = Array.isArray(raw) ? raw[0] ?? null : raw ?? null;
  return <QuotationPrintView itineraryId={id} publicMode themeToken={themeToken} />;
}
