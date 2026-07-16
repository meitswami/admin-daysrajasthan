import nodemailer from "nodemailer";
import type { ServerSmtpConfig } from "@/lib/email/get-server-smtp";

export type OutboundMail = {
  to: string;
  toName?: string | null;
  subject: string;
  text: string;
  html: string;
  fromEmail?: string;
  fromName?: string;
  cc?: string | null;
};

export async function sendViaSmtp(config: ServerSmtpConfig, mail: OutboundMail) {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    tls: config.secure ? undefined : { rejectUnauthorized: process.env.NODE_ENV === "production" },
  });

  const fromAddress = mail.fromEmail ?? config.fromEmail;
  const fromName = mail.fromName ?? config.fromName;

  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: mail.toName ? `"${mail.toName}" <${mail.to}>` : mail.to,
    cc: mail.cc ?? undefined,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });

  return { messageId: info.messageId, accepted: info.accepted };
}
