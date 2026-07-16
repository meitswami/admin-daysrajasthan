import { DEFAULT_PROVIDER_ORDER } from "../constants";
import type { ProviderAdapter, ProviderId, ProviderPrompt, ProviderResult } from "../types";

const unavailable = (id: ProviderId): ProviderAdapter => ({
  id,
  isAvailable: () => false,
  complete: async () => {
    throw new Error(`Provider ${id} is not configured`);
  },
});

/**
 * Provider adapters — no SDK wiring yet. Swap via registerProvider.
 * Provider-specific logic stays inside this module only.
 */
const registry = new Map<ProviderId, ProviderAdapter>([
  ["huggingface", unavailable("huggingface")],
  ["github-models", unavailable("github-models")],
  ["openrouter", unavailable("openrouter")],
  ["local", unavailable("local")],
  ["azure", unavailable("azure")],
  ["openai", unavailable("openai")],
  ["anthropic", unavailable("anthropic")],
]);

export function registerProvider(adapter: ProviderAdapter): void {
  registry.set(adapter.id, adapter);
}

export function getProvider(id: ProviderId): ProviderAdapter | undefined {
  if (id === "none") return undefined;
  return registry.get(id);
}

export function listProviders(): ProviderAdapter[] {
  return [...registry.values()];
}

export async function selectProvider(preferred?: ProviderId): Promise<ProviderAdapter | null> {
  if (preferred && preferred !== "none") {
    const p = registry.get(preferred);
    if (p && (await p.isAvailable())) return p;
  }
  for (const id of DEFAULT_PROVIDER_ORDER) {
    const p = registry.get(id);
    if (p && (await p.isAvailable())) return p;
  }
  return null;
}

export async function runProvider(
  adapter: ProviderAdapter,
  prompt: ProviderPrompt
): Promise<ProviderResult> {
  return adapter.complete(prompt);
}

export const SUBMODULE = {
  parent: "intelligence" as const,
  id: "provider" as const,
  description: "HuggingFace / GitHub Models / OpenRouter / future Azure·OpenAI·Anthropic·local",
} as const;
