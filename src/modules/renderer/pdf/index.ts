import type {
  PresentationBlock,
  PdfRenderOutput,
  RendererThemeContext,
} from "../types";

function blockToText(block: PresentationBlock): { heading: string | null; body: string } {
  switch (block.kind) {
    case "chat_message":
      return { heading: block.title, body: block.text };
    case "timeline":
      return {
        heading: block.title,
        body: block.steps.map((s) => `${s.order}. ${s.title}`).join("\n"),
      };
    case "itinerary":
      return {
        heading: block.title,
        body: block.days.map((d) => `Day ${d.day}: ${d.title}`).join("\n"),
      };
    case "package_card":
    case "destination_card":
    case "hotel_card":
      return { heading: block.title, body: block.subtitle ?? "" };
    case "package_comparison":
      return {
        heading: block.title,
        body: block.rows.map((r) => JSON.stringify(r)).join("\n"),
      };
    case "quotation":
      return {
        heading: block.title,
        body: [...block.lines.map((l) => `${l.label}: ${l.value}`), block.disclaimer].join("\n"),
      };
    default:
      return {
        heading: block.title,
        body: "subtitle" in block && block.subtitle ? String(block.subtitle) : "",
      };
  }
}

/**
 * PDF adapter — document model only (no binary generation yet).
 */
export function toPdfOutput(
  blocks: PresentationBlock[],
  theme: RendererThemeContext,
  title = "Travel Days"
): PdfRenderOutput {
  return {
    outputType: "pdf",
    theme,
    title,
    sections: blocks.map((b) => {
      const { heading, body } = blockToText(b);
      return { heading, body, pageBreakAfter: b.kind === "itinerary" };
    }),
    blocks,
  };
}

export const SUBMODULE = {
  parent: "renderer" as const,
  id: "pdf" as const,
  description: "PDF document presentation model",
} as const;
