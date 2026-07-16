import type {
  BookingEmailLogEntry,
  EmailDeliveryStatus,
  EmailFolder,
  TeamEmailMessage,
} from "@/types/team-email";
import { newUuid } from "@/lib/itinerary-builder/defaults";

const STORAGE_KEY = "travel-days-team-email-v1";
const DEMO_FROM = "vandana@traveldays.in";
const DEMO_FROM_NAME = "Vandana Shekhawat";
const DEMO_USER = "Vandana Shekhawat";

function now() {
  return new Date().toISOString();
}

function seedMessages(): TeamEmailMessage[] {
  const t = "2026-07-11T09:42:00Z";
  return [
    {
      id: "em-seed-001",
      folder: "sent",
      from_email: DEMO_FROM,
      from_name: DEMO_FROM_NAME,
      to_email: "ranveer@example.com",
      to_name: "Ranveer Singh",
      cc: null,
      subject: "Itinerary options for your trip — QRT807",
      body_text: "Dear Mr. Ranveer Singh,\n\nOption 1 — Deluxe Hotels: ₹123,000\n...",
      body_html: "<p>Dear Mr. Ranveer Singh,</p>",
      template_id: "itinerary_suggestion",
      itinerary_id: null,
      quote_id: "QRT807",
      delivery_status: "sent",
      send_count: 1,
      seen: true,
      seen_at: "2026-07-11T10:15:00Z",
      scheduled_at: null,
      sent_at: t,
      created_at: t,
      updated_at: t,
      created_by: DEMO_USER,
      error_message: null,
    },
    {
      id: "em-seed-002",
      folder: "inbox",
      from_email: "ranveer@example.com",
      from_name: "Ranveer Singh",
      to_email: DEMO_FROM,
      to_name: DEMO_FROM_NAME,
      cc: null,
      subject: "Re: Itinerary options — QRT807",
      body_text: "We prefer Option 1 Deluxe. Please confirm.",
      body_html: "<p>We prefer Option 1 Deluxe. Please confirm.</p>",
      template_id: null,
      itinerary_id: null,
      quote_id: "QRT807",
      delivery_status: "received",
      send_count: 0,
      seen: false,
      seen_at: null,
      scheduled_at: null,
      sent_at: null,
      created_at: "2026-07-11T11:00:00Z",
      updated_at: "2026-07-11T11:00:00Z",
      created_by: "system",
      error_message: null,
    },
    {
      id: "em-seed-003",
      folder: "draft",
      from_email: DEMO_FROM,
      from_name: DEMO_FROM_NAME,
      to_email: "vikas@example.com",
      to_name: "Vikas Sharma",
      cc: null,
      subject: "Itinerary options for your trip — QRT805",
      body_text: "Draft itinerary suggestion for Golden Triangle...",
      body_html: "<p>Draft...</p>",
      template_id: "itinerary_suggestion",
      itinerary_id: null,
      quote_id: "QRT805",
      delivery_status: "draft",
      send_count: 0,
      seen: false,
      seen_at: null,
      scheduled_at: null,
      sent_at: null,
      created_at: "2026-07-11T14:00:00Z",
      updated_at: "2026-07-11T14:00:00Z",
      created_by: DEMO_USER,
      error_message: null,
    },
  ];
}

function loadMessages(): TeamEmailMessage[] {
  if (typeof window === "undefined") return seedMessages();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedMessages();
    return JSON.parse(raw) as TeamEmailMessage[];
  } catch {
    return seedMessages();
  }
}

function saveMessages(messages: TeamEmailMessage[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
}

export function listMessages(folder?: EmailFolder): TeamEmailMessage[] {
  let list = loadMessages();
  if (folder) list = list.filter((m) => m.folder === folder);
  return list.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export function getMessage(id: string): TeamEmailMessage | null {
  return loadMessages().find((m) => m.id === id) ?? null;
}

export function saveMessage(message: Omit<TeamEmailMessage, "id" | "created_at" | "updated_at"> & { id?: string }): TeamEmailMessage {
  const messages = loadMessages();
  const ts = now();
  if (message.id) {
    const idx = messages.findIndex((m) => m.id === message.id);
    if (idx >= 0) {
      messages[idx] = { ...messages[idx], ...message, updated_at: ts };
      saveMessages(messages);
      return messages[idx];
    }
  }
  const created: TeamEmailMessage = {
    ...message,
    id: message.id ?? newUuid(),
    created_at: ts,
    updated_at: ts,
  };
  messages.unshift(created);
  saveMessages(messages);
  return created;
}

export function moveMessage(id: string, folder: EmailFolder): TeamEmailMessage | null {
  const messages = loadMessages();
  const idx = messages.findIndex((m) => m.id === id);
  if (idx < 0) return null;
  messages[idx] = { ...messages[idx], folder, updated_at: now() };
  saveMessages(messages);
  return messages[idx];
}

export function markMessageSeen(id: string): TeamEmailMessage | null {
  const messages = loadMessages();
  const idx = messages.findIndex((m) => m.id === id);
  if (idx < 0) return null;
  messages[idx] = {
    ...messages[idx],
    seen: true,
    seen_at: now(),
    updated_at: now(),
  };
  saveMessages(messages);
  return messages[idx];
}

export function queueOutboundSend(
  input: Omit<TeamEmailMessage, "id" | "created_at" | "updated_at" | "delivery_status" | "send_count" | "seen" | "seen_at" | "sent_at" | "error_message"> & {
    id?: string;
    scheduled_at?: string | null;
  }
): TeamEmailMessage {
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

/** Demo: simulate SMTP send — moves outbox → sent */
export function completeSend(messageId: string): TeamEmailMessage | null {
  const messages = loadMessages();
  const idx = messages.findIndex((m) => m.id === messageId);
  if (idx < 0) return null;
  const msg = messages[idx];
  const ts = now();
  messages[idx] = {
    ...msg,
    folder: "sent",
    delivery_status: "sent",
    send_count: msg.send_count + 1,
    sent_at: ts,
    updated_at: ts,
    error_message: null,
  };
  saveMessages(messages);
  return messages[idx];
}

export function resendMessage(messageId: string): TeamEmailMessage | null {
  return completeSend(messageId);
}

export function getBookingEmailLogs(): BookingEmailLogEntry[] {
  return loadMessages()
    .filter((m) => m.quote_id && (m.folder === "sent" || m.folder === "outbox" || m.delivery_status === "pending"))
    .map((m) => ({
      id: m.id,
      message_id: m.id,
      quote_id: m.quote_id!,
      itinerary_id: m.itinerary_id ?? "",
      client_name: m.to_name ?? m.to_email,
      client_email: m.to_email,
      sent_at: m.sent_at ?? m.created_at,
      delivery_status: (m.delivery_status === "sent" ? "sent" : "pending") as BookingEmailLogEntry["delivery_status"],
      seen: m.seen,
      send_count: Math.max(1, m.send_count),
    }))
    .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
}

export function getEmailStats() {
  const all = loadMessages();
  const bookingLogs = getBookingEmailLogs();
  return {
    totalEmails: all.length,
    totalSends: all.reduce((s, m) => s + m.send_count, 0),
    pending: bookingLogs.filter((l) => l.delivery_status === "pending").length,
    seen: bookingLogs.filter((l) => l.seen).length,
    unseen: bookingLogs.filter((l) => !l.seen).length,
    inboxUnread: all.filter((m) => m.folder === "inbox" && !m.seen).length,
  };
}

export function getServerEmailSeed() {
  return { messages: seedMessages() };
}

export const TEAM_MAIL_DEFAULTS = {
  from_email: DEMO_FROM,
  from_name: DEMO_FROM_NAME,
  company_name: "Travel Days Rajasthan",
  agent_name: DEMO_USER,
};
