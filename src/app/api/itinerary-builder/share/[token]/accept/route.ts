import { NextResponse } from "next/server";
import { z } from "zod";
import {
  acceptShareLink,
  getShareLink,
  isShareExpired,
  verifySharePin,
} from "@/lib/itinerary-builder/share-store";

const bodySchema = z.object({
  accepted_by_name: z.string().min(2),
  pin: z.string().optional().nullable(),
});

type Params = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  const link = getShareLink(token);
  if (!link) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }
  if (isShareExpired(link)) {
    return NextResponse.json({ error: "Expired" }, { status: 410 });
  }
  if (link.accepted_at) {
    return NextResponse.json({ error: "Already accepted" }, { status: 409 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  if (!verifySharePin(link, parsed.data.pin ?? null)) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 403 });
  }

  const updated = acceptShareLink(token, parsed.data.accepted_by_name);
  return NextResponse.json({
    accepted_at: updated?.accepted_at,
    accepted_by_name: updated?.accepted_by_name,
  });
}
