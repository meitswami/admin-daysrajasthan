/**
 * Hugging Face Inference Router — OpenAI-compatible chat completions.
 * Matches working client:
 *   baseURL: https://router.huggingface.co/v1
 *   model:   Qwen/Qwen2.5-3B-Instruct:featherless-ai
 *
 * HF router requires `model:provider` (e.g. `:featherless-ai`). Bare model ids fail with model_not_supported.
 */

import { DEFAULT_HF_MODEL, PROVIDER_TIMEOUT_MS } from "../constants";
import type { ProviderAdapter, ProviderPrompt, ProviderResult } from "../types";
import {
  getProviderApiKey,
  getProviderEnabled,
  getProviderModel,
  markProviderError,
  markProviderSuccess,
  setProviderModel,
} from "./secrets";

const HF_ROUTER_URL = "https://router.huggingface.co/v1/chat/completions";

/** Ensure router model includes an inference provider suffix. */
export function normalizeHuggingFaceModelId(modelId: string | null | undefined): string {
  const raw = (modelId ?? "").trim() || DEFAULT_HF_MODEL;
  if (raw.includes(":")) return raw;
  // Preferred provider from HF model card for Qwen2.5-3B-Instruct
  if (
    raw === "Qwen/Qwen2.5-3B-Instruct" ||
    raw.toLowerCase() === "qwen/qwen2.5-3b-instruct"
  ) {
    return "Qwen/Qwen2.5-3B-Instruct:featherless-ai";
  }
  // Generic fallback: append featherless-ai when no provider was selected
  return `${raw}:featherless-ai`;
}

export const huggingfaceProvider: ProviderAdapter = {
  id: "huggingface",
  isAvailable: () => {
    const cfg = getProviderEnabled("huggingface");
    if (cfg && !cfg.enabled) return false;
    if (cfg === null) return Boolean(getProviderApiKey("huggingface"));
    return Boolean(cfg.enabled && getProviderApiKey("huggingface"));
  },
  complete: async (prompt: ProviderPrompt): Promise<ProviderResult> => {
    const started = Date.now();
    const apiKey = getProviderApiKey("huggingface");
    if (!apiKey) {
      markProviderError("huggingface", "Missing Hugging Face token");
      throw new Error("Hugging Face API key not configured");
    }
    const configured = getProviderModel("huggingface", DEFAULT_HF_MODEL);
    const model = normalizeHuggingFaceModelId(configured);
    if (model !== configured) setProviderModel("huggingface", model);

    try {
      const res = await fetch(HF_ROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: prompt.temperature ?? 0.4,
          max_tokens: prompt.maxTokens ?? 1200,
          messages: prompt.messages,
        }),
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        const msg = `Hugging Face HTTP ${res.status}: ${body.slice(0, 220)}`;
        markProviderError("huggingface", msg);
        throw new Error(msg);
      }

      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const rawText = json.choices?.[0]?.message?.content?.trim() || "";
      if (!rawText) {
        markProviderError("huggingface", "Empty completion");
        throw new Error("Hugging Face returned empty completion");
      }
      markProviderSuccess("huggingface", model);
      return {
        providerId: "huggingface",
        rawText,
        latencyMs: Date.now() - started,
        usage: {
          promptTokens: json.usage?.prompt_tokens,
          completionTokens: json.usage?.completion_tokens,
        },
      };
    } catch (err) {
      if (err instanceof Error && !err.message.startsWith("Hugging Face")) {
        markProviderError("huggingface", err.message);
      }
      throw err;
    }
  },
};
