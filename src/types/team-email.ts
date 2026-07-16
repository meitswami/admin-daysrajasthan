/** Team mailbox & booking-linked outbound email */

export type EmailFolder = "inbox" | "draft" | "sent" | "scheduled" | "outbox" | "spam";

export type EmailDeliveryStatus =
  | "draft"
  | "scheduled"
  | "queued"
  | "sent"
  | "failed"
  | "received"
  | "pending";

export type EmailTemplateId = "itinerary_suggestion" | "quotation_follow_up" | "booking_confirmation";

export interface TeamEmailMessage {
  id: string;
  folder: EmailFolder;
  from_email: string;
  from_name: string;
  to_email: string;
  to_name: string | null;
  cc: string | null;
  subject: string;
  body_text: string;
  body_html: string;
  template_id: EmailTemplateId | null;
  /** Linked booking */
  itinerary_id: string | null;
  quote_id: string | null;
  delivery_status: EmailDeliveryStatus;
  send_count: number;
  seen: boolean;
  seen_at: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  error_message: string | null;
}

export interface BookingEmailLogEntry {
  id: string;
  message_id: string;
  quote_id: string;
  itinerary_id: string;
  client_name: string;
  client_email: string | null;
  sent_at: string;
  delivery_status: EmailDeliveryStatus;
  seen: boolean;
  send_count: number;
}

export const EMAIL_FOLDER_LABELS: Record<EmailFolder, string> = {
  inbox: "Inbox",
  draft: "Draft",
  sent: "Sent",
  scheduled: "Scheduled",
  outbox: "Outbox",
  spam: "Spam",
};

export const EMAIL_FOLDER_ORDER: EmailFolder[] = [
  "inbox",
  "draft",
  "sent",
  "scheduled",
  "outbox",
  "spam",
];
