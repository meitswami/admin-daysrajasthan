import { ModuleError } from "@/modules/shared";

import { RENDERER_MODULE_ID } from "./constants";
import { rendererInputDocumentSchema, renderOptionsSchema } from "./schemas";
import type { RendererInputDocument, RenderOptions } from "./types";

export function parseRendererInput(input: unknown): RendererInputDocument {
  const parsed = rendererInputDocumentSchema.safeParse(input);
  if (!parsed.success) {
    throw new ModuleError(
      RENDERER_MODULE_ID,
      "INVALID_INPUT",
      "Invalid renderer input document",
      { cause: parsed.error.flatten() }
    );
  }
  return parsed.data as RendererInputDocument;
}

export function parseRenderOptions(input: unknown): RenderOptions {
  const parsed = renderOptionsSchema.safeParse(input);
  if (!parsed.success) {
    throw new ModuleError(
      RENDERER_MODULE_ID,
      "INVALID_OPTIONS",
      "Invalid render options",
      { cause: parsed.error.flatten() }
    );
  }
  return parsed.data as RenderOptions;
}
