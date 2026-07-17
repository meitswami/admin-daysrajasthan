/**
 * Server-only provider API key store.
 * Raw keys never leave this module in API responses — only masked hints.
 */

import type { ProviderId } from "@/modules/intelligence";

export type ProviderSecretRecord = {
  providerId: ProviderId;
  apiKey: string;
  updatedAt: string;
};

export type ProviderRuntimeStatus = {
  providerId: ProviderId;
  status: "idle" | "ready" | "error" | "disabled" | "untested";
  lastSuccessAt: string | null;
  lastError: string | null;
  lastTestedAt: string | null;
  modelId: string | null;
  enabled: boolean;
  priority: number;
};

const g = globalThis as typeof globalThis & {
  __tdProviderSecrets?: Map<ProviderId, ProviderSecretRecord>;
  __tdProviderRuntime?: Map<ProviderId, ProviderRuntimeStatus>;
  __tdProviderModels?: Map<ProviderId, string>;
  __tdProviderEnabled?: Map<ProviderId, { enabled: boolean; priority: number }>;
  __tdActiveProviderId?: ProviderId | null;
};

function secrets(): Map<ProviderId, ProviderSecretRecord> {
  if (!g.__tdProviderSecrets) g.__tdProviderSecrets = new Map();
  return g.__tdProviderSecrets;
}

function runtime(): Map<ProviderId, ProviderRuntimeStatus> {
  if (!g.__tdProviderRuntime) g.__tdProviderRuntime = new Map();
  return g.__tdProviderRuntime;
}

function models(): Map<ProviderId, string> {
  if (!g.__tdProviderModels) g.__tdProviderModels = new Map();
  return g.__tdProviderModels;
}

function enabledMap(): Map<ProviderId, { enabled: boolean; priority: number }> {
  if (!g.__tdProviderEnabled) g.__tdProviderEnabled = new Map();
  return g.__tdProviderEnabled;
}

export function maskApiKey(raw: string): string {
  const key = raw.trim();
  if (key.length < 8) return "****";
  return `${key.slice(0, 4)}****${key.slice(-4)}`;
}

export function setProviderApiKey(providerId: ProviderId, apiKey: string): string {
  const trimmed = apiKey.trim();
  if (!trimmed) {
    secrets().delete(providerId);
    return "";
  }
  secrets().set(providerId, {
    providerId,
    apiKey: trimmed,
    updatedAt: new Date().toISOString(),
  });
  return maskApiKey(trimmed);
}

export function clearProviderApiKey(providerId: ProviderId): void {
  secrets().delete(providerId);
}

export function getProviderApiKey(providerId: ProviderId): string | null {
  const stored = secrets().get(providerId)?.apiKey?.trim();
  if (stored) return stored;

  // Env fallbacks (never logged)
  if (providerId === "github-models") {
    return process.env.GITHUB_TOKEN?.trim() || process.env.GITHUB_MODELS_TOKEN?.trim() || null;
  }
  if (providerId === "groq") {
    return process.env.GROQ_API_KEY?.trim() || null;
  }
  if (providerId === "huggingface") {
    return process.env.HF_TOKEN?.trim() || null;
  }
  if (providerId === "openrouter") {
    return process.env.OPENROUTER_API_KEY?.trim() || null;
  }
  if (providerId === "openai") {
    return process.env.OPENAI_API_KEY?.trim() || null;
  }
  return null;
}

export function hasProviderApiKey(providerId: ProviderId): boolean {
  return Boolean(getProviderApiKey(providerId));
}

export function getMaskedProviderApiKey(providerId: ProviderId): string | null {
  const stored = secrets().get(providerId)?.apiKey;
  if (stored) return maskApiKey(stored);
  if (hasProviderApiKey(providerId)) return "env****configured";
  return null;
}

export function setProviderModel(providerId: ProviderId, modelId: string | null): void {
  if (!modelId?.trim()) {
    models().delete(providerId);
    return;
  }
  models().set(providerId, modelId.trim());
}

export function getProviderModel(providerId: ProviderId, fallback: string): string {
  return models().get(providerId)?.trim() || fallback;
}

export function setProviderEnabled(
  providerId: ProviderId,
  enabled: boolean,
  priority: number
): void {
  enabledMap().set(providerId, { enabled, priority });
}

export function getProviderEnabled(providerId: ProviderId): { enabled: boolean; priority: number } | null {
  return enabledMap().get(providerId) ?? null;
}

export function listEnabledProviderOrder(): ProviderId[] {
  return [...enabledMap().entries()]
    .filter(([, v]) => v.enabled)
    .sort((a, b) => a[1].priority - b[1].priority)
    .map(([id]) => id)
    .filter((id) => id !== "none");
}

export function markProviderSuccess(providerId: ProviderId, modelId?: string | null): void {
  const prev = runtime().get(providerId);
  runtime().set(providerId, {
    providerId,
    status: "ready",
    lastSuccessAt: new Date().toISOString(),
    lastError: null,
    lastTestedAt: new Date().toISOString(),
    modelId: modelId ?? prev?.modelId ?? null,
    enabled: getProviderEnabled(providerId)?.enabled ?? prev?.enabled ?? true,
    priority: getProviderEnabled(providerId)?.priority ?? prev?.priority ?? 99,
  });
  g.__tdActiveProviderId = providerId;
}

export function markProviderError(providerId: ProviderId, error: string): void {
  const prev = runtime().get(providerId);
  runtime().set(providerId, {
    providerId,
    status: "error",
    lastSuccessAt: prev?.lastSuccessAt ?? null,
    lastError: error.slice(0, 300),
    lastTestedAt: new Date().toISOString(),
    modelId: prev?.modelId ?? null,
    enabled: getProviderEnabled(providerId)?.enabled ?? prev?.enabled ?? false,
    priority: getProviderEnabled(providerId)?.priority ?? prev?.priority ?? 99,
  });
}

export function getProviderRuntimeStatus(providerId: ProviderId): ProviderRuntimeStatus | null {
  return runtime().get(providerId) ?? null;
}

export function listProviderRuntimeStatuses(): ProviderRuntimeStatus[] {
  return [...runtime().values()];
}

export function getActiveProviderId(): ProviderId | null {
  return g.__tdActiveProviderId ?? null;
}

export function syncProviderConfigFromSlots(
  slots: Array<{
    providerId: string;
    enabled: boolean;
    priority: number;
    modelId?: string | null;
  }>
): void {
  for (const slot of slots) {
    const id = slot.providerId as ProviderId;
    if (id === "none") continue;
    setProviderEnabled(id, slot.enabled, slot.priority);
    if (slot.modelId) setProviderModel(id, slot.modelId);
    const prev = runtime().get(id);
    runtime().set(id, {
      providerId: id,
      status: slot.enabled
        ? prev?.status === "ready"
          ? "ready"
          : hasProviderApiKey(id) || id === "local"
            ? "idle"
            : "untested"
        : "disabled",
      lastSuccessAt: prev?.lastSuccessAt ?? null,
      lastError: slot.enabled ? prev?.lastError ?? null : null,
      lastTestedAt: prev?.lastTestedAt ?? null,
      modelId: slot.modelId ?? prev?.modelId ?? null,
      enabled: slot.enabled,
      priority: slot.priority,
    });
  }
}
