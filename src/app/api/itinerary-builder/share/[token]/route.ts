import { NextResponse } from "next/server";
import {
  getShareLink,
  isShareExpired,
  recordShareView,
} from "@/lib/itinerary-builder/share-store";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  const link = getShareLink(token);
  if (!link) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }
  if (isShareExpired(link)) {
    return NextResponse.json({ error: "This proposal link has expired" }, { status: 410 });
  }

  recordShareView(token);

  return NextResponse.json({
    token: link.token,
    quote_id: link.quote_id,
    version_number: link.version_number,
    revision_id: link.revision_id,
    client_name: link.client_name,
    snapshot: link.snapshot,
    requires_pin: Boolean(link.pin),
    accepted_at: link.accepted_at,
    accepted_by_name: link.accepted_by_name,
    view_count: link.view_count,
  });
}
