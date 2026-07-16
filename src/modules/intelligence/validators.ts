import { ModuleError } from "@/modules/shared";

import { INTELLIGENCE_MODULE_ID } from "./constants";
import { intelligenceRequestSchema } from "./schemas";
import type { IntelligenceRequest } from "./types";

export function parseIntelligenceRequest(input: unknown): IntelligenceRequest {
  const parsed = intelligenceRequestSchema.safeParse(input);
  if (!parsed.success) {
    throw new ModuleError(
      INTELLIGENCE_MODULE_ID,
      "INVALID_REQUEST",
      "Invalid intelligence request",
      { cause: parsed.error.flatten() }
    );
  }
  return parsed.data as IntelligenceRequest;
}

export function assertNoHtmlOrMarkdownContract(value: unknown): void {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("<") && trimmed.includes(">")) {
      throw new ModuleError(
        INTELLIGENCE_MODULE_ID,
        "PRESENTATION_FORBIDDEN",
        "Intelligence must not return HTML"
      );
    }
  }
}
