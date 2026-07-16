import { NextResponse } from "next/server";

/** Internal admin push — forwards customer/quote events to Travel CRM webhook when configured */
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const crmUrl = process.env.CRM_WEBHOOK_URL;
    const secret = process.env.CRM_WEBHOOK_SECRET;

    if (!crmUrl || !secret) {
      return NextResponse.json({
        ok: true,
        mode: "demo",
        note: "CRM_WEBHOOK_URL / CRM_WEBHOOK_SECRET not set — customer linked locally only",
      });
    }

    const res = await fetch(crmUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": secret,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(
      { ok: res.ok, mode: "webhook", crm: data },
      { status: res.ok ? 200 : 502 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "CRM push failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
