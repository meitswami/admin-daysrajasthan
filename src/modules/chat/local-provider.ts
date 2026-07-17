/**
 * Local AI provider — prefers light Ollama / llama.cpp, falls back to catalog mock.
 * Target: Hostinger KVM2 (2 vCPU / 8GB) with qwen2.5:1.5b or phi3:mini.
 */

import { registerProvider } from "@/modules/intelligence";
import type { ProviderAdapter, ProviderPrompt, ProviderResult } from "@/modules/intelligence";
import { mockTravelProvider } from "./mock-provider";
import { ollamaLocalProvider } from "./ollama-provider";

let registered = false;

/**
 * Composite `local` adapter:
 * 1) Ollama / llama.cpp when reachable
 * 2) Deterministic catalog mock otherwise (dev / no GPU)
 */
export const localTravelProvider: ProviderAdapter = {
  id: "local",
  isAvailable: () => true,
  complete: async (prompt: ProviderPrompt): Promise<ProviderResult> => {
    try {
      if (await ollamaLocalProvider.isAvailable()) {
        return await ollamaLocalProvider.complete(prompt);
      }
    } catch {
      /* fall through to mock */
    }
    return mockTravelProvider.complete(prompt);
  },
};

/** Idempotent — call from chat API / orchestration. */
export function ensureLocalProviderRegistered(): void {
  if (registered) return;
  registerProvider(localTravelProvider);
  registered = true;
}

/** @deprecated use ensureLocalProviderRegistered */
export function ensureMockProviderRegistered(): void {
  ensureLocalProviderRegistered();
}
