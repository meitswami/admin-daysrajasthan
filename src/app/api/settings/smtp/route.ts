import { NextResponse } from "next/server";
import { persistServerSmtp } from "@/lib/email/get-server-smtp";
import type { SmtpSettings } from "@/types/site-settings";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { smtp?: SmtpSettings; fromName?: string };
    if (!body.smtp?.host || !body.smtp.email || !body.smtp.password) {
      return NextResponse.json({ error: "Invalid SMTP settings" }, { status: 400 });
    }

    const persisted = await persistServerSmtp(body.smtp, body.fromName);

    return NextResponse.json({
      ok: true,
      persisted,
      note: persisted
        ? "SMTP saved for server-side delivery"
        : "Saved locally only — Supabase unavailable",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { getServerSmtpConfig } = await import("@/lib/email/get-server-smtp");
    const config = await getServerSmtpConfig();
    if (!config) {
      return NextResponse.json({ configured: false });
    }
    return NextResponse.json({
      configured: true,
      source: config.source,
      host: config.host,
      fromEmail: config.fromEmail,
    });
  } catch {
    return NextResponse.json({ configured: false });
  }
}
