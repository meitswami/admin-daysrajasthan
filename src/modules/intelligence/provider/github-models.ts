/**
 * GitHub Models provider — OpenAI-compatible inference API.
 * Default model: Mistral Small (3.1 family) — configurable from Super Admin.
 */

import {
  DEFAULT_GITHUB_MODELS_MODEL,
  PROVIDER_TIMEOUT_MS,
} from "../constants";
import type { ProviderAdapter, ProviderPrompt, ProviderResult } from "../types";
import {
  getProviderApiKey,
  getProviderEnabled,
  getProviderModel,
  markProviderError,
  markProviderSuccess,
} from "./secrets";

const GITHUB_MODELS_URL = "https://models.github.ai/inference/chat/completions";

export const githubModelsProvider: ProviderAdapter = {
  id: "github-models",
  isAvailable: () => {
    const cfg = getProviderEnabled("github-models");
    if (cfg && !cfg.enabled) return false;
    // If never synced from admin, allow env-based availability
    if (cfg === null) return Boolean(getProviderApiKey("github-models"));
    return Boolean(cfg.enabled && getProviderApiKey("github-models"));
  },
  complete: async (prompt: ProviderPrompt): Promise<ProviderResult> => {
    const started = Date.now();
    const apiKey = getProviderApiKey("github-models");
    if (!apiKey) {
      markProviderError("github-models", "Missing GitHub token");
      throw new Error("GitHub Models API key not configured");
    }
    const model = getProviderModel("github-models", DEFAULT_GITHUB_MODELS_MODEL);

    try {
      const res = await fetch(GITHUB_MODELS_URL, {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${apiKey}`,
          "X-GitHub-Api-Version": "2022-11-28",
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
        const msg = `GitHub Models HTTP ${res.status}: ${body.slice(0, 180)}`;
        markProviderError("github-models", msg);
        throw new Error(msg);
      }

      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const rawText = json.choices?.[0]?.message?.content?.trim() || "";
      if (!rawText) {
        markProviderError("github-models", "Empty completion");
        throw new Error("GitHub Models returned empty completion");
      }
      markProviderSuccess("github-models", model);
      return {
        providerId: "github-models",
        rawText,
        latencyMs: Date.now() - started,
        usage: {
          promptTokens: json.usage?.prompt_tokens,
          completionTokens: json.usage?.completion_tokens,
        },
      };
    } catch (err) {
      if (err instanceof Error && !err.message.startsWith("GitHub Models")) {
        markProviderError("github-models", err.message);
      }
      throw err;
    }
  },
};
