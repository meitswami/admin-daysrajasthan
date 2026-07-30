import { notFound } from "next/navigation";
import { QuotationPrintView } from "@/components/itinerary-builder/quotation-print-view";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string | string[] }>;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Public client-facing quotation URL: /{itineraryId}/quotation?v=… */
export default async function ShortPublicQuotationPage({ params, searchParams }: Props) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const sp = await searchParams;
  const raw = sp.v;
  const themeToken = Array.isArray(raw) ? raw[0] ?? null : raw ?? null;
  return <QuotationPrintView itineraryId={id} publicMode themeToken={themeToken} />;
}
