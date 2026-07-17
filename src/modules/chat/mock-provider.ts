/**
 * Mock AI provider — implements Intelligence ProviderAdapter via registerProvider.
 * No HuggingFace / OpenAI hardcoding.
 */

import { registerProvider } from "@/modules/intelligence";
import type { ProviderAdapter, ProviderPrompt, ProviderResult } from "@/modules/intelligence";

let registered = false;

type FactLine = {
  kind: string;
  title: string;
  subtitle: string | null;
};

/** Parse RETRIEVED FACTS lines into visitor-facing fields (never expose internal ids). */
function parseFactLines(factsBlock: string): FactLine[] {
  return factsBlock
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^\d+\./.test(l))
    .slice(0, 5)
    .map((line) => {
      const kindMatch = line.match(/\[([^\]]+)\]/);
      const titleMatch = line.match(/title=([^·\n]+)/i);
      const subtitleMatch = line.match(/subtitle=([^·\n]+)/i);
      const title = titleMatch?.[1]?.trim() || line.replace(/^\d+\.\s*/, "").slice(0, 120);
      return {
        kind: kindMatch?.[1]?.trim() || "result",
        title,
        subtitle: subtitleMatch?.[1]?.trim() || null,
      };
    })
    .filter((f) => f.title.length > 0);
}

function labelForKind(kind: string): string {
  if (kind === "package") return "Package";
  if (kind === "destination") return "Destination";
  if (kind === "knowledge") return "Guide";
  return "Match";
}

function buildMockNarrative(prompt: ProviderPrompt): string {
  const user = [...prompt.messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const factsBlock = user.includes("RETRIEVED FACTS")
    ? user.slice(user.indexOf("RETRIEVED FACTS"))
    : "";
  const facts = parseFactLines(factsBlock);

  if (facts.length === 0) {
    return "I looked through our Travel Days catalog but did not find a strong match yet. Try a destination name, trip length, or travel style — I only use real packages and destinations from Search + Knowledge.";
  }

  const bullets = facts
    .map((f) => {
      const label = labelForKind(f.kind);
      return f.subtitle
        ? `• ${label}: ${f.title} — ${f.subtitle}`
        : `• ${label}: ${f.title}`;
    })
    .join("\n");

  return [
    "Here is what I found in our Travel Days catalog:",
    bullets,
    "",
    "I can refine by budget, days, or travel style. Ask for a quote anytime — pricing comes from our Quotation Engine.",
  ].join("\n");
}

export const mockTravelProvider: ProviderAdapter = {
  id: "local",
  isAvailable: () => true,
  complete: async (prompt: ProviderPrompt): Promise<ProviderResult> => {
    const started = Date.now();
    const rawText = buildMockNarrative(prompt);
    return {
      providerId: "local",
      rawText,
      latencyMs: Date.now() - started,
      usage: { promptTokens: 0, completionTokens: rawText.length },
    };
  },
};

/** Prefer ensureLocalProviderRegistered from ./local-provider (Ollama + mock fallback). */
export function ensureMockProviderRegistered(): void {
  if (registered) return;
  // Soft-register mock only; local-provider overwrites with composite when loaded
  registerProvider(mockTravelProvider);
  registered = true;
}

export const SUBMODULE = {
  parent: "chat" as const,
  id: "mock-provider" as const,
  description: "Catalog-grounded mock fallback when Ollama is offline",
} as const;
