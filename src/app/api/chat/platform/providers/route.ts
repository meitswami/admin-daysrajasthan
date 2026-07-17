import { z } from "zod";
import {
  clearProviderApiKey,
  getActiveProviderId,
  getMaskedProviderApiKey,
  getProviderApiKey,
  hasProviderApiKey,
  listProviderRuntimeStatuses,
  markProviderError,
  markProviderSuccess,
  setProviderApiKey,
  setProviderModel,
  syncProviderConfigFromSlots,
  githubModelsProvider,
  groqProvider,
  huggingfaceProvider,
  normalizeHuggingFaceModelId,
  type ProviderId,
} from "@/modules/intelligence";
import {
  DEFAULT_GITHUB_MODELS_MODEL,
  DEFAULT_GROQ_MODEL,
  DEFAULT_HF_MODEL,
} from "@/modules/intelligence";
import { ensureServerChatPlatformState, mutateServerChatPlatformState } from "@/modules/chat/server-store";
import type { AiProviderSlot } from "@/modules/chat";
import { ensureLocalProviderRegistered } from "@/modules/chat/local-provider";

const providerIdSchema = z.enum([
  "huggingface",
  "github-models",
  "groq",
  "openrouter",
  "openai",
  "anthropic",
  "azure",
  "local",
  "none",
]);

const saveConfigSchema = z.object({
  action: z.literal("save_config"),
  providers: z.array(
    z.object({
      id: z.string(),
      providerId: providerIdSchema,
      label: z.string(),
      enabled: z.boolean(),
      envKeyHint: z.string().nullable(),
      priority: z.number().int(),
      modelId: z.string().nullable().optional(),
    })
  ),
});

const saveKeySchema = z.object({
  action: z.literal("save_key"),
  providerId: providerIdSchema,
  apiKey: z.string().min(1).max(500),
});

const clearKeySchema = z.object({
  action: z.literal("clear_key"),
  providerId: providerIdSchema,
});

const testSchema = z.object({
  action: z.literal("test"),
  providerId: providerIdSchema,
});

const bodySchema = z.discriminatedUnion("action", [
  saveConfigSchema,
  saveKeySchema,
  clearKeySchema,
  testSchema,
]);

function enrichSlots(slots: AiProviderSlot[]): AiProviderSlot[] {
  const statuses = new Map(listProviderRuntimeStatuses().map((s) => [s.providerId, s]));
  const active = getActiveProviderId();
  return slots.map((p) => {
    const st = statuses.get(p.providerId as ProviderId);
    return {
      ...p,
      apiKeyMasked: getMaskedProviderApiKey(p.providerId as ProviderId),
      hasApiKey: p.providerId === "local" ? true : hasProviderApiKey(p.providerId as ProviderId),
      status: !p.enabled
        ? "disabled"
        : st?.status ?? (hasProviderApiKey(p.providerId as ProviderId) ? "idle" : "untested"),
      lastSuccessAt: st?.lastSuccessAt ?? p.lastSuccessAt ?? null,
      lastError: st?.lastError ?? p.lastError ?? null,
      lastTestedAt: st?.lastTestedAt ?? p.lastTestedAt ?? null,
      // Surface active marker via status when this is the live provider
      ...(active === p.providerId && p.enabled ? { status: "ready" as const } : null),
    };
  });
}

function activateFromSlots(slots: AiProviderSlot[]): void {
  ensureLocalProviderRegistered();
  syncProviderConfigFromSlots(
    slots.map((p) => ({
      providerId: p.providerId,
      enabled: p.enabled,
      priority: p.priority,
      modelId: p.modelId ?? null,
    }))
  );
}

/**
 * POST /api/chat/platform/providers
 * Save config / keys / test connection — keys never returned raw.
 */
export async function POST(request: Request) {
  try {
    ensureServerChatPlatformState();
    ensureLocalProviderRegistered();
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json(
        { success: false, message: "Invalid provider payload", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const input = parsed.data;

    if (input.action === "save_config") {
      const nextSlots = input.providers.map((p) => {
        const modelId =
          p.providerId === "huggingface"
            ? normalizeHuggingFaceModelId(p.modelId)
            : (p.modelId ?? null);
        return {
          ...p,
          apiKeyMasked: getMaskedProviderApiKey(p.providerId as ProviderId),
          hasApiKey: hasProviderApiKey(p.providerId as ProviderId),
          modelId,
          status: p.enabled ? ("idle" as const) : ("disabled" as const),
          lastSuccessAt: null,
          lastError: null,
          lastTestedAt: null,
        };
      }) as AiProviderSlot[];

      // Preserve prior status fields from server state where possible
      const prev = ensureServerChatPlatformState().providers;
      const merged = nextSlots.map((slot) => {
        const old = prev.find((p) => p.id === slot.id || p.providerId === slot.providerId);
        return {
          ...slot,
          lastSuccessAt: old?.lastSuccessAt ?? null,
          lastError: old?.lastError ?? null,
          lastTestedAt: old?.lastTestedAt ?? null,
          apiKeyMasked: getMaskedProviderApiKey(slot.providerId as ProviderId),
          hasApiKey:
            slot.providerId === "local"
              ? true
              : hasProviderApiKey(slot.providerId as ProviderId),
        };
      });

      mutateServerChatPlatformState((s) => ({ ...s, providers: merged }));
      activateFromSlots(merged);

      return Response.json({
        success: true,
        message: "Providers saved — active immediately",
        data: {
          providers: enrichSlots(merged),
          activeProviderId: getActiveProviderId(),
        },
      });
    }

    if (input.action === "save_key") {
      const masked = setProviderApiKey(input.providerId as ProviderId, input.apiKey);
      mutateServerChatPlatformState((s) => ({
        ...s,
        providers: s.providers.map((p) =>
          p.providerId === input.providerId
            ? {
                ...p,
                apiKeyMasked: masked,
                hasApiKey: true,
                status: p.enabled ? "idle" : "disabled",
              }
            : p
        ),
      }));
      activateFromSlots(ensureServerChatPlatformState().providers);
      return Response.json({
        success: true,
        message: "API key saved (masked)",
        data: {
          providerId: input.providerId,
          apiKeyMasked: masked,
          hasApiKey: true,
        },
      });
    }

    if (input.action === "clear_key") {
      clearProviderApiKey(input.providerId as ProviderId);
      mutateServerChatPlatformState((s) => ({
        ...s,
        providers: s.providers.map((p) =>
          p.providerId === input.providerId
            ? { ...p, apiKeyMasked: null, hasApiKey: false, status: "untested" }
            : p
        ),
      }));
      return Response.json({
        success: true,
        message: "API key cleared",
        data: { providerId: input.providerId },
      });
    }

    // test
    const id = input.providerId as ProviderId;
    if (id === "none") {
      return Response.json({ success: false, message: "Cannot test none provider" }, { status: 400 });
    }

    activateFromSlots(ensureServerChatPlatformState().providers);
    const slot = ensureServerChatPlatformState().providers.find((p) => p.providerId === id);
    let modelForTest = slot?.modelId ?? null;
    if (id === "huggingface") {
      modelForTest = normalizeHuggingFaceModelId(slot?.modelId);
      setProviderModel("huggingface", modelForTest);
      // Persist corrected model id (with :featherless-ai) back to admin slot
      mutateServerChatPlatformState((s) => ({
        ...s,
        providers: s.providers.map((p) =>
          p.providerId === "huggingface" ? { ...p, modelId: modelForTest } : p
        ),
      }));
    } else if (slot?.modelId) {
      setProviderModel(id, slot.modelId);
    }

    const prompt = {
      messages: [
        { role: "system" as const, content: "Reply with exactly: OK" },
        { role: "user" as const, content: "ping" },
      ],
      temperature: 0,
      maxTokens: 16,
    };

    try {
      const adapters = {
        "github-models": githubModelsProvider,
        groq: groqProvider,
        huggingface: huggingfaceProvider,
      } as const;

      if (id === "github-models" || id === "groq" || id === "huggingface") {
        if (!getProviderApiKey(id)) {
          throw new Error(
            id === "github-models"
              ? "No GitHub token configured"
              : id === "groq"
                ? "No Groq API key configured"
                : "No Hugging Face token configured"
          );
        }
        const result = await adapters[id].complete(prompt);
        const defaultModel =
          id === "github-models"
            ? DEFAULT_GITHUB_MODELS_MODEL
            : id === "groq"
              ? DEFAULT_GROQ_MODEL
              : DEFAULT_HF_MODEL;
        markProviderSuccess(id, modelForTest ?? slot?.modelId ?? defaultModel);
        mutateServerChatPlatformState((s) => ({
          ...s,
          providers: s.providers.map((p) =>
            p.providerId === id
              ? {
                  ...p,
                  status: "ready",
                  lastSuccessAt: new Date().toISOString(),
                  lastError: null,
                  lastTestedAt: new Date().toISOString(),
                }
              : p
          ),
        }));
        const labels = {
          "github-models": "GitHub Models connected",
          groq: "Groq connected",
          huggingface: "Hugging Face connected",
        } as const;
        return Response.json({
          success: true,
          message: labels[id],
          data: {
            providerId: id,
            latencyMs: result.latencyMs,
            sample: result.rawText.slice(0, 80),
            providers: enrichSlots(ensureServerChatPlatformState().providers),
            activeProviderId: getActiveProviderId(),
          },
        });
      }

      if (id === "local") {
        const { localTravelProvider } = await import("@/modules/chat/local-provider");
        const result = await localTravelProvider.complete(prompt);
        markProviderSuccess("local", null);
        return Response.json({
          success: true,
          message: "Local provider reachable (Ollama or mock fallback)",
          data: {
            providerId: id,
            latencyMs: result.latencyMs,
            sample: result.rawText.slice(0, 80),
            providers: enrichSlots(ensureServerChatPlatformState().providers),
            activeProviderId: getActiveProviderId(),
          },
        });
      }

      return Response.json(
        { success: false, message: `Test not implemented for ${id} yet` },
        { status: 400 }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      markProviderError(id, message);
      mutateServerChatPlatformState((s) => ({
        ...s,
        providers: s.providers.map((p) =>
          p.providerId === id
            ? {
                ...p,
                status: "error",
                lastError: message.slice(0, 300),
                lastTestedAt: new Date().toISOString(),
              }
            : p
        ),
      }));
      return Response.json(
        {
          success: false,
          message,
          data: { providers: enrichSlots(ensureServerChatPlatformState().providers) },
        },
        { status: 400 }
      );
    }
  } catch (err) {
    return Response.json(
      { success: false, message: err instanceof Error ? err.message : "Provider API error" },
      { status: 400 }
    );
  }
}

export async function GET() {
  ensureServerChatPlatformState();
  ensureLocalProviderRegistered();
  activateFromSlots(ensureServerChatPlatformState().providers);
  const state = ensureServerChatPlatformState();
  return Response.json({
    success: true,
    data: {
      providers: enrichSlots(state.providers),
      activeProviderId: getActiveProviderId(),
      runtime: listProviderRuntimeStatuses(),
    },
  });
}
