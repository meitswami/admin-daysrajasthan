/**
 * Team email — Supabase `team_email_messages` only.
 * No localStorage, no demo seed rows.
 */
import type {
  BookingEmailLogEntry,
  EmailDeliveryStatus,
  EmailFolder,
  TeamEmailMessage,
} from "@/types/team-email";
import { newUuid } from "@/lib/itinerary-builder/defaults";
import { isSupabaseConfigured } from "@/lib/system/data-mode";

const DEMO_FROM = "vandana@traveldays.in";
const DEMO_FROM_NAME = "Vandana Shekhawat";
const DEMO_USER = "Vandana Shekhawat";

function now() {
  return new Date().toISOString();
}

function requireCloud(): void {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Email cannot be saved without a database.");
  }
}

async function supabase() {
  const { createClient } = await import("@/lib/supabase/client");
  return createClient();
}

function mapRow(row: Record<string, unknown>): TeamEmailMessage {
  return {
    id: String(row.id),
    folder: row.folder as EmailFolder,
    from_email: String(row.from_email ?? ""),
    from_name: String(row.from_name ?? ""),
    to_email: String(row.to_email ?? ""),
    to_name: (row.to_name as string | null) ?? null,
    cc: (row.cc as string | null) ?? null,
    subject: String(row.subject ?? ""),
    body_text: String(row.body_text ?? ""),
    body_html: String(row.body_html ?? ""),
    template_id: (row.template_id as TeamEmailMessage["template_id"]) ?? null,
    itinerary_id: (row.itinerary_id as string | null) ?? null,
    quote_id: (row.quote_id as string | null) ?? null,
    delivery_status: (row.delivery_status as EmailDeliveryStatus) ?? "draft",
    send_count: Number(row.send_count) || 0,
    seen: Boolean(row.seen),
    seen_at: (row.seen_at as string | null) ?? null,
    scheduled_at: (row.scheduled_at as string | null) ?? null,
    sent_at: (row.sent_at as string | null) ?? null,
    created_at: String(row.created_at ?? now()),
    updated_at: String(row.updated_at ?? now()),
    created_by: String(row.created_by ?? ""),
    error_message: (row.error_message as string | null) ?? null,
  };
}

function toRow(message: TeamEmailMessage) {
  return {
    id: message.id,
    folder: message.folder,
    from_email: message.from_email,
    from_name: message.from_name,
    to_email: message.to_email,
    to_name: message.to_name,
    cc: message.cc,
    subject: message.subject,
    body_text: message.body_text,
    body_html: message.body_html,
    template_id: message.template_id,
    itinerary_id: message.itinerary_id,
    quote_id: message.quote_id,
    delivery_status: message.delivery_status,
    send_count: message.send_count,
    seen: message.seen,
    seen_at: message.seen_at,
    scheduled_at: message.scheduled_at,
    sent_at: message.sent_at,
    created_by: message.created_by,
    error_message: message.error_message,
    created_at: message.created_at,
    updated_at: message.updated_at,
  };
}

export async function listMessages(folder?: EmailFolder): Promise<TeamEmailMessage[]> {
  if (!isSupabaseConfigured()) return [];
  const sb = await supabase();
  let query = sb.from("team_email_messages").select("*").order("updated_at", { ascending: false });
  if (folder) query = query.eq("folder", folder);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function getMessage(id: string): Promise<TeamEmailMessage | null> {
  if (!isSupabaseConfigured()) return null;
  const sb = await supabase();
  const { data, error } = await sb.from("team_email_messages").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRow(data as Record<string, unknown>) : null;
}

export async function saveMessage(
  message: Omit<TeamEmailMessage, "id" | "created_at" | "updated_at"> & { id?: string }
): Promise<TeamEmailMessage> {
  requireCloud();
  const ts = now();
  const existingId = message.id;
  let created: TeamEmailMessage;

  if (existingId) {
    const prev = await getMessage(existingId);
    if (prev) {
      created = { ...prev, ...message, id: existingId, updated_at: ts };
    } else {
      created = {
        ...message,
        id: existingId,
        created_at: ts,
        updated_at: ts,
      } as TeamEmailMessage;
    }
  } else {
    created = {
      ...message,
      id: newUuid(),
      created_at: ts,
      updated_at: ts,
    } as TeamEmailMessage;
  }

  const sb = await supabase();
  const { data, error } = await sb
    .from("team_email_messages")
    .upsert(toRow(created))
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Email save was blocked (no row returned).");
  return mapRow(data as Record<string, unknown>);
}

export async function moveMessage(id: string, folder: EmailFolder): Promise<TeamEmailMessage | null> {
  const prev = await getMessage(id);
  if (!prev) return null;
  return saveMessage({ ...prev, folder });
}

export async function markMessageSeen(id: string): Promise<TeamEmailMessage | null> {
  const prev = await getMessage(id);
  if (!prev) return null;
  return saveMessage({
    ...prev,
    seen: true,
    seen_at: now(),
  });
}

export async function queueOutboundSend(
  input: Omit<
    TeamEmailMessage,
    | "id"
    | "created_at"
    | "updated_at"
    | "delivery_status"
    | "send_count"
    | "seen"
    | "seen_at"
    | "sent_at"
    | "error_message"
  > & {
    id?: string;
    scheduled_at?: string | null;
  }
): Promise<TeamEmailMessage> {
  const folder: EmailFolder = input.scheduled_at ? "scheduled" : "outbox";
  const status: EmailDeliveryStatus = input.scheduled_at ? "scheduled" : "queued";
  return saveMessage({
    ...input,
    folder,
    delivery_status: status,
    send_count: 0,
    seen: false,
    seen_at: null,
    sent_at: null,
    error_message: null,
  });
}

export async function completeSend(messageId: string): Promise<TeamEmailMessage | null> {
  const prev = await getMessage(messageId);
  if (!prev) return null;
  const ts = now();
  return saveMessage({
    ...prev,
    folder: "sent",
    delivery_status: "sent",
    send_count: prev.send_count + 1,
    sent_at: ts,
    error_message: null,
  });
}

export async function resendMessage(messageId: string): Promise<TeamEmailMessage | null> {
  return completeSend(messageId);
}

export async function getBookingEmailLogs(): Promise<BookingEmailLogEntry[]> {
  const all = await listMessages();
  return all
    .filter(
      (m) =>
        m.quote_id &&
        (m.folder === "sent" || m.folder === "outbox" || m.delivery_status === "pending")
    )
    .map((m) => ({
      id: m.id,
      message_id: m.id,
      quote_id: m.quote_id!,
      itinerary_id: m.itinerary_id ?? "",
      client_name: m.to_name ?? m.to_email,
      client_email: m.to_email,
      sent_at: m.sent_at ?? m.created_at,
      delivery_status: (m.delivery_status === "sent"
        ? "sent"
        : "pending") as BookingEmailLogEntry["delivery_status"],
      seen: m.seen,
      send_count: Math.max(1, m.send_count),
    }))
    .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
}

export async function getEmailStats() {
  const all = await listMessages();
  const bookingLogs = await getBookingEmailLogs();
  return {
    totalEmails: all.length,
    totalSends: all.reduce((s, m) => s + m.send_count, 0),
    pending: bookingLogs.filter((l) => l.delivery_status === "pending").length,
    seen: bookingLogs.filter((l) => l.seen).length,
    unseen: bookingLogs.filter((l) => !l.seen).length,
    inboxUnread: all.filter((m) => m.folder === "inbox" && !m.seen).length,
  };
}

/** @deprecated No seed — returns empty. Kept for API compatibility. */
export function getServerEmailSeed() {
  return { messages: [] as TeamEmailMessage[] };
}

export const TEAM_MAIL_DEFAULTS = {
  from_email: DEMO_FROM,
  from_name: DEMO_FROM_NAME,
  company_name: "Travel Days Rajasthan",
  agent_name: DEMO_USER,
};
