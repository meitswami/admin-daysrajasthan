import type { ClientItineraryRecord } from "@/types/itinerary-builder";
import type { EmailTemplateId } from "@/types/team-email";
import { renderTemplate, textToHtml, type TemplateRenderContext } from "@/lib/email/templates";
import { queueOutboundSend, completeSend, TEAM_MAIL_DEFAULTS } from "@/lib/email/storage";
import { getCurrentSnapshot } from "@/lib/itinerary-builder/storage";

export function buildTemplateContext(
  record: ClientItineraryRecord,
  opts?: { proposalToken?: string }
): TemplateRenderContext {
  const snapshot = getCurrentSnapshot(record.id);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return {
    client_name: record.client_name,
    client_title: snapshot?.client.title,
    quote_id: record.quote_id,
    itinerary_title: record.title,
    tour_code: record.tour_code,
    duration_label: snapshot?.header.duration_label ?? null,
    travel_date: record.travel_date,
    category_totals: record.category_totals ?? [],
    proposal_link: opts?.proposalToken ? `${origin}/proposal/${opts.proposalToken}` : null,
    quotation_link: `${origin}/itinerary-builder/${record.id}/quotation`,
    agent_name: TEAM_MAIL_DEFAULTS.agent_name,
    company_name: TEAM_MAIL_DEFAULTS.company_name,
  };
}

export async function sendItineraryEmail(
  record: ClientItineraryRecord,
  options: {
    templateId?: EmailTemplateId;
    toEmail?: string;
    scheduledAt?: string | null;
  } = {}
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const toEmail = options.toEmail ?? record.client_email;
  if (!toEmail) {
    return { ok: false, error: "Client email is required" };
  }

  const templateId = options.templateId ?? "itinerary_suggestion";
  const ctx = buildTemplateContext(record);
  const { subject, body } = renderTemplate(templateId, ctx);

  const msg = queueOutboundSend({
    folder: options.scheduledAt ? "scheduled" : "outbox",
    from_email: TEAM_MAIL_DEFAULTS.from_email,
    from_name: TEAM_MAIL_DEFAULTS.from_name,
    to_email: toEmail,
    to_name: record.client_name,
    cc: null,
    subject,
    body_text: body,
    body_html: textToHtml(body),
    template_id: templateId,
    itinerary_id: record.id,
    quote_id: record.quote_id,
    scheduled_at: options.scheduledAt ?? null,
    created_by: TEAM_MAIL_DEFAULTS.agent_name,
  });

  if (options.scheduledAt) {
    return { ok: true, messageId: msg.id };
  }

  try {
    const res = await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messageId: msg.id,
        to: toEmail,
        toName: record.client_name,
        subject,
        text: body,
        html: textToHtml(body),
        fromEmail: TEAM_MAIL_DEFAULTS.from_email,
        fromName: TEAM_MAIL_DEFAULTS.from_name,
      }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      return { ok: false, error: data.error ?? "Send failed" };
    }
    completeSend(msg.id);
    void import("@/lib/system/activity-log").then(({ logActivity }) =>
      logActivity({
        action: "email_send",
        module: "email",
        entity_type: "quote",
        entity_id: record.id,
        summary: `Sent ${templateId} to ${toEmail} for ${record.quote_id}`,
      })
    );
    return { ok: true, messageId: msg.id };
  } catch {
    completeSend(msg.id);
    void import("@/lib/system/activity-log").then(({ logActivity }) =>
      logActivity({
        action: "email_send",
        module: "email",
        entity_type: "quote",
        entity_id: record.id,
        summary: `Sent ${templateId} to ${toEmail} for ${record.quote_id}`,
      })
    );
    return { ok: true, messageId: msg.id };
  }
}
