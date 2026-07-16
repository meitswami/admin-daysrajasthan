import type { SmtpSecure, SmtpSettings } from "@/types/site-settings";
import { createClient } from "@/lib/supabase/server";

export type ServerSmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
  fromEmail: string;
  fromName: string;
  source: "env" | "supabase";
};

function parseSecure(secure: SmtpSecure | string | undefined, port: number): boolean {
  if (secure === "SSL") return true;
  if (secure === "TLS") return false;
  if (secure === "None") return false;
  return port === 465;
}

function fromEnv(): ServerSmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER ?? process.env.SMTP_EMAIL;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT ?? "587");
  const secureFlag = process.env.SMTP_SECURE;
  const secure =
    secureFlag === "true" || secureFlag === "SSL"
      ? true
      : secureFlag === "false" || secureFlag === "TLS"
        ? false
        : port === 465;

  return {
    host,
    port,
    secure,
    auth: { user, pass },
    fromEmail: process.env.SMTP_FROM_EMAIL ?? user,
    fromName: process.env.SMTP_FROM_NAME ?? "Travel Days",
    source: "env",
  };
}

function fromStored(value: unknown): ServerSmtpConfig | null {
  if (!value || typeof value !== "object") return null;
  const s = value as Partial<SmtpSettings> & { from_name?: string };
  if (!s.host || !s.email || !s.password) return null;

  const port = Number(s.port || "587");
  return {
    host: s.host,
    port,
    secure: parseSecure(s.secure, port),
    auth: { user: s.email, pass: s.password },
    fromEmail: s.email,
    fromName: s.from_name ?? "Travel Days",
    source: "supabase",
  };
}

export async function getServerSmtpConfig(): Promise<ServerSmtpConfig | null> {
  const envConfig = fromEnv();
  if (envConfig) return envConfig;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("td_system_settings")
      .select("value")
      .eq("key", "smtp")
      .maybeSingle();

    return fromStored(data?.value);
  } catch {
    return null;
  }
}

export async function persistServerSmtp(settings: SmtpSettings, fromName?: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("td_system_settings").upsert({
      key: "smtp",
      value: { ...settings, from_name: fromName ?? "Travel Days" },
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}
