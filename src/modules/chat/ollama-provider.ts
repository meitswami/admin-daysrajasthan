/**
 * Light local LLM provider — Ollama first, then llama.cpp OpenAI-compatible API.
 * Tuned for small VPS (2 vCPU / 8GB): default model qwen2.5:1.5b / phi3:mini.
 */

import type { ProviderAdapter, ProviderPrompt, ProviderResult } from "@/modules/intelligence";

const OLLAMA_BASE =
  (typeof process !== "undefined" && process.env.OLLAMA_BASE_URL?.trim()) ||
  "http://127.0.0.1:11434";
const LLAMA_CPP_BASE =
  (typeof process !== "undefined" && process.env.LLAMA_CPP_BASE_URL?.trim()) || "";
/** Prefer tiny multilingual instruct models for Hostinger KVM2 */
const MODEL =
  (typeof process !== "undefined" && process.env.OLLAMA_MODEL?.trim()) ||
  (typeof process !== "undefined" && process.env.LOCAL_LLM_MODEL?.trim()) ||
  "qwen2.5:1.5b";

let availableCache: { at: number; ok: boolean; backend: "ollama" | "llamacpp" | null } = {
  at: 0,
  ok: false,
  backend: null,
};

async function probe(): Promise<"ollama" | "llamacpp" | null> {
  const now = Date.now();
  if (now - availableCache.at < 30_000) {
    return availableCache.ok ? availableCache.backend : null;
  }

  try {
    const res = await fetch(`${OLLAMA_BASE.replace(/\/$/, "")}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      availableCache = { at: now, ok: true, backend: "ollama" };
      return "ollama";
    }
  } catch {
    /* try llama.cpp next */
  }

  if (LLAMA_CPP_BASE) {
    try {
      const res = await fetch(`${LLAMA_CPP_BASE.replace(/\/$/, "")}/v1/models`, {
        method: "GET",
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        availableCache = { at: now, ok: true, backend: "llamacpp" };
        return "llamacpp";
      }
    } catch {
      /* unavailable */
    }
  }

  availableCache = { at: now, ok: false, backend: null };
  return null;
}

async function completeOllama(prompt: ProviderPrompt): Promise<string> {
  const res = await fetch(`${OLLAMA_BASE.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      options: {
        temperature: prompt.temperature ?? 0.3,
        num_predict: prompt.maxTokens ?? 512,
      },
      messages: prompt.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    throw new Error(`Ollama error ${res.status}`);
  }
  const json = (await res.json()) as { message?: { content?: string } };
  return json.message?.content?.trim() || "";
}

async function completeLlamaCpp(prompt: ProviderPrompt): Promise<string> {
  const res = await fetch(`${LLAMA_CPP_BASE.replace(/\/$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      temperature: prompt.temperature ?? 0.3,
      max_tokens: prompt.maxTokens ?? 512,
      messages: prompt.messages,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    throw new Error(`llama.cpp error ${res.status}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content?.trim() || "";
}

export const ollamaLocalProvider: ProviderAdapter = {
  id: "local",
  isAvailable: async () => Boolean(await probe()),
  complete: async (prompt: ProviderPrompt): Promise<ProviderResult> => {
    const started = Date.now();
    const backend = await probe();
    if (!backend) {
      throw new Error("Local LLM (Ollama / llama.cpp) is not available");
    }
    const rawText =
      backend === "ollama" ? await completeOllama(prompt) : await completeLlamaCpp(prompt);
    return {
      providerId: "local",
      rawText:
        rawText ||
        "I could not generate a reply from the local model. Please try again or ask a team member.",
      latencyMs: Date.now() - started,
      usage: { promptTokens: 0, completionTokens: rawText.length },
    };
  },
};

/** Prefer ensureLocalProviderRegistered — Ollama is probed inside the composite local adapter. */
export function ensureOllamaProviderRegistered(): void {
  // no-op: composite local provider owns registration
}

export const SUBMODULE = {
  parent: "chat" as const,
  id: "ollama-provider" as const,
  description: "Light Ollama / llama.cpp local provider for small VPS",
} as const;
