import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getPublicQuotation,
  publishPublicQuotation,
} from "@/lib/itinerary-builder/public-quotation-store";
import { publicQuotationUrl } from "@/lib/admin-public-url";
import { clampPreviewTheme } from "@/lib/itinerary-builder/preview-themes";
import type { CategoryTotalSummary, ItinerarySnapshot } from "@/types/itinerary-builder";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  quote_id: z.string().min(1),
  version_number: z.number().int().positive(),
  revision_id: z.string().min(1),
  client_name: z.string().min(1),
  snapshot: z.record(z.string(), z.unknown()),
  category_totals: z.array(z.record(z.string(), z.unknown())).optional(),
});

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const payload = getPublicQuotation(id);
  if (!payload) {
    return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
  }
  return NextResponse.json(payload);
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const payload = publishPublicQuotation({
    itinerary_id: id,
    quote_id: parsed.data.quote_id,
    version_number: parsed.data.version_number,
    revision_id: parsed.data.revision_id,
    client_name: parsed.data.client_name,
    snapshot: parsed.data.snapshot as unknown as ItinerarySnapshot,
    category_totals: (parsed.data.category_totals ?? []) as unknown as CategoryTotalSummary[],
    published_at: new Date().toISOString(),
  });

  const themeId = clampPreviewTheme(
    (parsed.data.snapshot as { preview_theme?: unknown }).preview_theme
  );
  return NextResponse.json({
    ...payload,
    url: publicQuotationUrl(id, null, themeId),
  });
}
