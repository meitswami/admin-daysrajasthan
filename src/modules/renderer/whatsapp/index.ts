import type {
  PresentationBlock,
  RendererThemeContext,
  WhatsAppRenderOutput,
} from "../types";

function blockWhatsApp(block: PresentationBlock): string {
  switch (block.kind) {
    case "chat_message":
      return block.text;
    case "package_card":
      return `📦 *${block.name}*${block.summary ? `\n${block.summary}` : ""}`;
    case "destination_card":
      return `📍 *${block.name}*${block.summary ? `\n${block.summary}` : ""}`;
    case "timeline":
      return block.steps.map((s) => `${s.order}. ${s.title}`).join("\n");
    case "itinerary":
      return ["*Itinerary*", ...block.days.map((d) => `Day ${d.day}: ${d.title}`)].join("\n");
    case "quotation":
      return [
        `*${block.title ?? "Quotation"}*`,
        ...block.lines.map((l) => `${l.label}: ${l.value}`),
        `_${block.disclaimer}_`,
      ].join("\n");
    case "cta":
      return `→ ${block.label}`;
    default:
      return block.title ?? "";
  }
}

/**
 * WhatsApp adapter — plain message lines (no Meta API).
 */
export function toWhatsAppOutput(
  blocks: PresentationBlock[],
  theme: RendererThemeContext
): WhatsAppRenderOutput {
  return {
    outputType: "whatsapp",
    theme,
    messages: blocks.map(blockWhatsApp).filter(Boolean),
    blocks,
  };
}

export const SUBMODULE = {
  parent: "renderer" as const,
  id: "whatsapp" as const,
  description: "WhatsApp message presentation lines",
} as const;
