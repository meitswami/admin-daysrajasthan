import type { CategoryTotalSummary } from "@/types/itinerary-builder";
import type { EmailTemplateId } from "@/types/team-email";

export type TemplateRenderContext = {
  client_name: string;
  client_title?: string;
  quote_id: string;
  itinerary_title: string;
  tour_code: string | null;
  duration_label: string | null;
  travel_date: string | null;
  category_totals: CategoryTotalSummary[];
  proposal_link: string | null;
  quotation_link: string | null;
  agent_name: string;
  company_name: string;
};

export type EmailTemplate = {
  id: EmailTemplateId;
  name: string;
  description: string;
  subject: (ctx: TemplateRenderContext) => string;
  body: (ctx: TemplateRenderContext) => string;
};

function formatInrPlain(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function itineraryOptionsBlock(ctx: TemplateRenderContext): string {
  const tiers = ctx.category_totals ?? [];
  if (tiers.length === 0) {
    return `Itinerary: ${ctx.itinerary_title}\nDuration: ${ctx.duration_label ?? "—"}`;
  }
  return tiers
    .map(
      (t, i) =>
        `Option ${i + 1} — ${t.label}: ${formatInrPlain(t.grand_total)}\n` +
        `   ${ctx.itinerary_title}${ctx.duration_label ? ` · ${ctx.duration_label}` : ""}`.trim()
    )
    .join("\n\n");
}

/** Fixed ItinerarySuggestion format — body contains itinerary selection options only */
export const EMAIL_TEMPLATES: Record<EmailTemplateId, EmailTemplate> = {
  itinerary_suggestion: {
    id: "itinerary_suggestion",
    name: "Itinerary Suggestion",
    description: "Client selects from prefetched tier options — fixed V1 format",
    subject: (ctx) => `Itinerary options for your trip — ${ctx.quote_id}`,
    body: (ctx) => {
      const options = itineraryOptionsBlock(ctx);
      return (
        `Dear ${ctx.client_title ? `${ctx.client_title}. ` : ""}${ctx.client_name},\n\n` +
        `Thank you for choosing ${ctx.company_name}. Please review and select your preferred itinerary option below:\n\n` +
        `${options}\n\n` +
        (ctx.proposal_link ? `View interactive proposal: ${ctx.proposal_link}\n` : "") +
        (ctx.quotation_link ? `Download quotation PDF: ${ctx.quotation_link}\n` : "") +
        `\nReply with your selected option number and we will proceed with confirmation.\n\n` +
        `Warm regards,\n${ctx.agent_name}\n${ctx.company_name}`
      );
    },
  },
  quotation_follow_up: {
    id: "quotation_follow_up",
    name: "Quotation Follow-up",
    description: "Reminder for pending quote",
    subject: (ctx) => `Following up — ${ctx.quote_id} · ${ctx.itinerary_title}`,
    body: (ctx) =>
      `Dear ${ctx.client_name},\n\n` +
      `We wanted to follow up on quotation ${ctx.quote_id} for "${ctx.itinerary_title}".\n\n` +
      `${itineraryOptionsBlock(ctx)}\n\n` +
      `Please let us know if you have questions or would like to confirm.\n\n` +
      `${ctx.agent_name}\n${ctx.company_name}`,
  },
  booking_confirmation: {
    id: "booking_confirmation",
    name: "Booking Confirmation",
    description: "Sent after client confirms",
    subject: (ctx) => `Booking confirmed — ${ctx.quote_id}`,
    body: (ctx) =>
      `Dear ${ctx.client_name},\n\n` +
      `Your booking ${ctx.quote_id} for "${ctx.itinerary_title}" is confirmed.\n` +
      `Travel date: ${ctx.travel_date ?? "To be finalized"}\n\n` +
      `Our operations team will share vouchers shortly.\n\n` +
      `${ctx.agent_name}\n${ctx.company_name}`,
  },
};

export function renderTemplate(
  templateId: EmailTemplateId,
  ctx: TemplateRenderContext
): { subject: string; body: string } {
  const tpl = EMAIL_TEMPLATES[templateId];
  return {
    subject: tpl.subject(ctx),
    body: tpl.body(ctx),
  };
}

export function textToHtml(text: string): string {
  return text
    .split("\n")
    .map((line) => (line.trim() === "" ? "<br/>" : `<p>${escapeHtml(line)}</p>`))
    .join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
