import type {
  EmailRenderOutput,
  PresentationBlock,
  RendererThemeContext,
} from "../types";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function blockPlain(block: PresentationBlock): string {
  if (block.kind === "chat_message") return block.text;
  if (block.kind === "package_card" || block.kind === "destination_card") {
    return `${block.title}${block.subtitle ? ` — ${block.subtitle}` : ""}`;
  }
  if (block.kind === "timeline") {
    return block.steps.map((s) => `${s.order}. ${s.title}`).join("\n");
  }
  return block.title ?? block.kind;
}

/**
 * Email adapter — HTML skeleton + plain text (no send).
 */
export function toEmailOutput(
  blocks: PresentationBlock[],
  theme: RendererThemeContext,
  pageTitle?: string | null
): EmailRenderOutput {
  const subject = pageTitle ?? "Travel Days update";
  const maroon = theme.tokens.color.maroon ?? "#5C0A0A";
  const cream = theme.tokens.color.cream ?? "#F5F0E8";
  const parts = blocks.map(blockPlain);
  const textPlain = parts.join("\n\n");
  const htmlSkeleton = [
    `<!DOCTYPE html><html><body style="background:${cream};color:${theme.tokens.color.ink};font-family:${theme.tokens.typography.fontSans};">`,
    `<h1 style="color:${maroon};">${escapeHtml(subject)}</h1>`,
    ...parts.map((p) => `<p>${escapeHtml(p)}</p>`),
    `</body></html>`,
  ].join("");

  return {
    outputType: "email",
    theme,
    subject,
    preheader: parts[0]?.slice(0, 120) ?? "Travel Days",
    htmlSkeleton,
    textPlain,
    blocks,
  };
}

export const SUBMODULE = {
  parent: "renderer" as const,
  id: "email" as const,
  description: "Email HTML/text presentation model",
} as const;
