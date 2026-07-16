import { NextResponse } from "next/server";
import { z } from "zod";
import { createShareLink } from "@/lib/itinerary-builder/share-store";
import type { ItinerarySnapshot } from "@/types/itinerary-builder";

const bodySchema = z.object({
  itinerary_id: z.string().min(1),
  revision_id: z.string().min(1),
  quote_id: z.string().min(1),
  version_number: z.number().int().positive(),
  snapshot: z.record(z.string(), z.unknown()),
  client_name: z.string().min(1),
  pin: z.string().optional().nullable(),
  expires_at: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const link = createShareLink({
    ...parsed.data,
    snapshot: parsed.data.snapshot as unknown as ItinerarySnapshot,
  });

  const origin = new URL(request.url).origin;
  return NextResponse.json({
    token: link.token,
    url: `${origin}/proposal/${link.token}`,
    version_number: link.version_number,
    revision_id: link.revision_id,
    expires_at: link.expires_at,
  });
}
