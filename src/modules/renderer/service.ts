/**
 * Universal Renderer Engine — DTO → presentation models → output adapters.
 * Never queries DB / Search / Supabase / Providers.
 */

import { mapDocumentBlocks } from "./blocks";
import {
  DEFAULT_COLOR_MODE,
  DEFAULT_OUTPUT_TYPE,
  DEFAULT_SURFACE,
} from "./constants";
import { toEmailOutput } from "./email";
import { buildMetadataModel } from "./metadata";
import { toPdfOutput } from "./pdf";
import { toReactOutput } from "./react-adapter";
import { buildSeoModel } from "./seo";
import { buildThemeContext } from "./theme";
import type {
  PresentationBlock,
  RenderOptions,
  RenderOutput,
  RendererInputDocument,
} from "./types";
import { parseRenderOptions, parseRendererInput } from "./validators";
import { toWhatsAppOutput } from "./whatsapp";

/**
 * Map input DTOs to presentation blocks (theme-aware metadata attached in render).
 */
export function mapToPresentation(input: unknown): PresentationBlock[] {
  const doc = parseRendererInput(input);
  return mapDocumentBlocks(doc.blocks);
}

/**
 * Full render pipeline: validate → theme → map → output adapter.
 */
export function renderDocument(
  input: unknown,
  optionsInput?: unknown
): RenderOutput {
  const doc = parseRendererInput(input);
  const options: RenderOptions = optionsInput
    ? parseRenderOptions(optionsInput)
    : { outputType: DEFAULT_OUTPUT_TYPE, surface: DEFAULT_SURFACE, mode: DEFAULT_COLOR_MODE };

  const theme = buildThemeContext({
    mode: options.mode ?? DEFAULT_COLOR_MODE,
    reducedMotion: options.reducedMotion,
    highContrast: options.highContrast,
  });

  const blocks = mapDocumentBlocks(doc.blocks);

  const withMeta: PresentationBlock[] = [
    buildSeoModel({
      pageTitle: options.pageTitle,
      description:
        blocks.find((b) => b.kind === "chat_message" && "text" in b)
          ? String((blocks.find((b) => b.kind === "chat_message") as { text?: string })?.text ?? "").slice(
              0,
              160
            )
          : null,
    }),
    buildMetadataModel({
      surface: options.surface ?? DEFAULT_SURFACE,
      locale: options.locale ?? doc.locale ?? null,
      traceId: doc.traceId ?? null,
      blockCount: blocks.length,
    }),
    ...blocks,
  ];

  switch (options.outputType) {
    case "react":
      return toReactOutput(withMeta, theme);
    case "pdf":
      return toPdfOutput(withMeta, theme, options.pageTitle ?? "Travel Days");
    case "email":
      return toEmailOutput(withMeta, theme, options.pageTitle);
    case "whatsapp":
      return toWhatsAppOutput(withMeta, theme);
    case "native_mobile_future":
      return {
        outputType: "native_mobile_future",
        theme,
        screens: [{ id: "main", blocks: withMeta }],
        blocks: withMeta,
      };
    case "json":
    default:
      return {
        outputType: "json",
        theme,
        blocks: withMeta,
      };
  }
}

/**
 * Convenience: render Intelligence-shaped result `{ blocks }` to JSON presentation.
 */
export function renderIntelligenceDto(
  intelligenceLike: { blocks: RendererInputDocument["blocks"]; traceId?: string },
  options?: Partial<RenderOptions>
): RenderOutput {
  return renderDocument(
    { blocks: intelligenceLike.blocks, traceId: intelligenceLike.traceId ?? null },
    { outputType: options?.outputType ?? "json", ...options }
  );
}
