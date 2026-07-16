/**
 * Mock AI provider — implements Intelligence ProviderAdapter via registerProvider.
 * No HuggingFace / OpenAI hardcoding.
 */

import { registerProvider } from "@/modules/intelligence";
import type { ProviderAdapter, ProviderPrompt, ProviderResult } from "@/modules/intelligence";

let registered = false;

function buildMockNarrative(prompt: ProviderPrompt): string {
  const user = [...prompt.messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const factsBlock = user.includes("RETRIEVED FACTS")
    ? user.slice(user.indexOf("RETRIEVED FACTS"))
    : "";
  const lines = factsBlock
    .split("\n")
    .filter((l) => /^\d+\./.test(l.trim()))
    .slice(0, 4);

  if (lines.length === 0) {
    return "I looked through our Travel Days catalog but did not find a strong match yet. Try a destination name, trip length, or travel style — I only use real packages and destinations from Search + Knowledge.";
  }

  const bullets = lines.map((l) => `• ${l.replace(/^\d+\.\s*/, "").slice(0, 160)}`).join("\n");
  return [
    "Here is what I found in our Travel Days catalog (grounded facts only — no invented prices):",
    bullets,
    "",
    "I can refine by budget, days, or travel style. Pricing always comes from the Quotation Engine when you request a quote.",
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

/** Idempotent — call from chat API / orchestration. */
export function ensureMockProviderRegistered(): void {
  if (registered) return;
  registerProvider(mockTravelProvider);
  registered = true;
}

export const SUBMODULE = {
  parent: "chat" as const,
  id: "mock-provider" as const,
  description: "Mock Travel Provider implementing Intelligence provider interface",
} as const;
