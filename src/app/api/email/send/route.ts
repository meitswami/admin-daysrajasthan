import { NextResponse } from "next/server";
import { getServerSmtpConfig } from "@/lib/email/get-server-smtp";
import { sendViaSmtp } from "@/lib/email/smtp-server";

type SendBody = {
  messageId?: string;
  to?: string;
  toName?: string | null;
  subject?: string;
  text?: string;
  html?: string;
  fromEmail?: string;
  fromName?: string;
  cc?: string | null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendBody;

    if (!body.messageId) {
      return NextResponse.json({ error: "messageId required" }, { status: 400 });
    }
    if (!body.to || !body.subject || (!body.text && !body.html)) {
      return NextResponse.json(
        { error: "to, subject, and text/html are required" },
        { status: 400 }
      );
    }

    const smtp = await getServerSmtpConfig();

    if (!smtp) {
      await new Promise((r) => setTimeout(r, 350));
      return NextResponse.json({
        ok: true,
        messageId: body.messageId,
        mode: "demo",
        note: "Configure SMTP in Settings or set SMTP_* env vars for production delivery",
      });
    }

    const result = await sendViaSmtp(smtp, {
      to: body.to,
      toName: body.toName,
      subject: body.subject,
      text: body.text ?? "",
      html: body.html ?? body.text ?? "",
      fromEmail: body.fromEmail,
      fromName: body.fromName,
      cc: body.cc,
    });

    return NextResponse.json({
      ok: true,
      messageId: body.messageId,
      mode: "smtp",
      source: smtp.source,
      providerMessageId: result.messageId,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
