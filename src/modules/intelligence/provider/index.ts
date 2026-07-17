import { DEFAULT_PROVIDER_ORDER, PROVIDER_TIMEOUT_MS } from "../constants";
import type { ProviderAdapter, ProviderId, ProviderPrompt, ProviderResult } from "../types";
import { githubModelsProvider } from "./github-models";
import { groqProvider } from "./groq";
import { huggingfaceProvider } from "./huggingface";
import { listEnabledProviderOrder } from "./secrets";

const unavailable = (id: ProviderId): ProviderAdapter => ({
  id,
  isAvailable: () => false,
  complete: async () => {
    throw new Error(`Provider ${id} is not configured`);
  },
});

/**
 * Provider adapters — hosted adapters register at module load.
 * Local/mock overwrite `local` from chat module at runtime.
 */
const registry = new Map<ProviderId, ProviderAdapter>([
  ["huggingface", huggingfaceProvider],
  ["github-models", githubModelsProvider],
  ["groq", groqProvider],
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

/** Resolve failover order: admin priorities → defaults (GitHub → Groq → local). */
export function resolveProviderOrder(preferred?: ProviderId): ProviderId[] {
  const configured = listEnabledProviderOrder();
  const base =
    configured.length > 0
      ? configured
      : (DEFAULT_PROVIDER_ORDER.filter((id) => id === "github-models" || id === "groq" || id === "local") as ProviderId[]);

  const ordered: ProviderId[] = [];
  if (preferred && preferred !== "none") ordered.push(preferred);
  for (const id of base) {
    if (!ordered.includes(id)) ordered.push(id);
  }
  for (const id of DEFAULT_PROVIDER_ORDER) {
    if (!ordered.includes(id)) ordered.push(id);
  }
  return ordered;
}

export async function selectProvider(preferred?: ProviderId): Promise<ProviderAdapter | null> {
  for (const id of resolveProviderOrder(preferred)) {
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

/**
 * Automatic failover: try next provider on failure / timeout / error.
 */
export async function runWithFailover(
  prompt: ProviderPrompt,
  preferred?: ProviderId
): Promise<ProviderResult & { attempted: ProviderId[] }> {
  const attempted: ProviderId[] = [];
  const errors: string[] = [];

  for (const id of resolveProviderOrder(preferred)) {
    const adapter = registry.get(id);
    if (!adapter) continue;
    try {
      if (!(await adapter.isAvailable())) continue;
    } catch {
      continue;
    }
    attempted.push(id);
    try {
      const result = await Promise.race([
        adapter.complete(prompt),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Provider ${id} timed out after ${PROVIDER_TIMEOUT_MS}ms`)),
            PROVIDER_TIMEOUT_MS
          )
        ),
      ]);
      return { ...result, attempted };
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  throw new Error(
    attempted.length
      ? `All providers failed (${attempted.join(" → ")}): ${errors[errors.length - 1] ?? "unknown"}`
      : "No AI provider available"
  );
}

export const SUBMODULE = {
  parent: "intelligence" as const,
  id: "provider" as const,
  description: "GitHub Models / Groq / local failover provider manager",
} as const;
