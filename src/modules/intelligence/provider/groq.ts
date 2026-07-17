/**
 * Groq provider — OpenAI-compatible free/fast fallback.
 */

import { DEFAULT_GROQ_MODEL, PROVIDER_TIMEOUT_MS } from "../constants";
import type { ProviderAdapter, ProviderPrompt, ProviderResult } from "../types";
import {
  getProviderApiKey,
  getProviderEnabled,
  getProviderModel,
  markProviderError,
  markProviderSuccess,
} from "./secrets";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export const groqProvider: ProviderAdapter = {
  id: "groq",
  isAvailable: () => {
    const cfg = getProviderEnabled("groq");
    if (cfg && !cfg.enabled) return false;
    if (cfg === null) return Boolean(getProviderApiKey("groq"));
    return Boolean(cfg.enabled && getProviderApiKey("groq"));
  },
  complete: async (prompt: ProviderPrompt): Promise<ProviderResult> => {
    const started = Date.now();
    const apiKey = getProviderApiKey("groq");
    if (!apiKey) {
      markProviderError("groq", "Missing Groq API key");
      throw new Error("Groq API key not configured");
    }
    const model = getProviderModel("groq", DEFAULT_GROQ_MODEL);

    try {
      const res = await fetch(GROQ_URL, {
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
        const msg = `Groq HTTP ${res.status}: ${body.slice(0, 180)}`;
        markProviderError("groq", msg);
        throw new Error(msg);
      }

      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const rawText = json.choices?.[0]?.message?.content?.trim() || "";
      if (!rawText) {
        markProviderError("groq", "Empty completion");
        throw new Error("Groq returned empty completion");
      }
      markProviderSuccess("groq", model);
      return {
        providerId: "groq",
        rawText,
        latencyMs: Date.now() - started,
        usage: {
          promptTokens: json.usage?.prompt_tokens,
          completionTokens: json.usage?.completion_tokens,
        },
      };
    } catch (err) {
      if (err instanceof Error && !err.message.startsWith("Groq")) {
        markProviderError("groq", err.message);
      }
      throw err;
    }
  },
};
