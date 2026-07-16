import { NextRequest, NextResponse } from "next/server";

/** Module 8 — forward website leads to Travel CRM */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-webhook-secret");
  if (secret !== process.env.CRM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const crmUrl = process.env.CRM_WEBHOOK_URL;

  if (!crmUrl) {
    return NextResponse.json({ error: "CRM webhook not configured" }, { status: 503 });
  }

  try {
    const res = await fetch(crmUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: res.ok, crm: data }, { status: res.ok ? 200 : 502 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "CRM sync failed" },
      { status: 502 }
    );
  }
}
