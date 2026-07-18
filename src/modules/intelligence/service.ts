/**
 * Travel Intelligence Engine service — decision brain for all AI surfaces.
 *
 * Client → API Gateway → Intelligence → Search → Knowledge → … → DTO → Renderer
 */

import { buildIntelligenceContext } from "./context-builder";
import { formatIntelligenceBlocks } from "./formatter";
import { logIntelligence } from "./logging";
import { loadTravelMemory } from "./memory";
import { retrieveViaSearch } from "./orchestrator";
import { parseProviderText } from "./parser";
import { planIntelligence } from "./planner";
import { buildProviderPrompt } from "./prompt-builder";
import { runWithFailover } from "./provider";
import { applySafetyRails } from "./safety";
import { recordIntelligenceMetric, startIntelligenceSpan, endIntelligenceSpan } from "./telemetry";
import type { IntelligenceRequest, IntelligenceResult, ProviderId } from "./types";
import { parseIntelligenceRequest } from "./validators";
import { validateIntelligenceBlocks } from "./validator";

function createTraceId(seed?: string): string {
  if (seed) return seed;
  return `int_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function fallbackNarrative(factsHitsCount: number): string {
  if (factsHitsCount === 0) {
    return "No catalog matches yet. Try another destination, package keyword, or travel style — results always come from Search + Knowledge.";
  }
  return "AI provider unavailable. Showing grounded Search + Knowledge results only.";
}

function searchOnlyNarrative(
  hits: Array<{ title: string; subtitle: string | null; kind: string }>
): string | null {
  if (!hits.length) return null;
  const packages = hits.filter((h) => h.kind === "package").length;
  const destinations = hits.filter((h) => h.kind === "destination").length;
  // Keep copy short — package/destination cards carry the clickable links.
  if (packages > 0 && destinations > 0) {
    return `I found ${packages} package${packages === 1 ? "" : "s"} and ${destinations} destination${destinations === 1 ? "" : "s"} in our catalog. Open any card below for full details on the website.`;
  }
  if (packages > 0) {
    return `I found ${packages} matching package${packages === 1 ? "" : "s"} in our Travel Days catalog. Tap a card below to open the full itinerary on the website.`;
  }
  if (destinations > 0) {
    return `I found ${destinations} destination${destinations === 1 ? "" : "s"} in our catalog. Open a card below for more details.`;
  }
  return "Here is what I found in our catalog — see the cards below.";
}

/**
 * Primary entry: run the full intelligence pipeline and return structured DTOs only.
 */
export async function runIntelligence(input: unknown): Promise<IntelligenceResult> {
  const startedAt = Date.now();
  const request = parseIntelligenceRequest(input);
  const traceId = createTraceId(request.traceId);
  const span = startIntelligenceSpan("runIntelligence");

  let providerUsed: ProviderId = "none";
  let usedFallback = false;
  const warnings: string[] = [];

  try {
    const memory = request.memory
      ? request.memory
      : await loadTravelMemory({
          customerId: request.customerId,
          sessionId: request.sessionId,
          inline: null,
        });

    const context = buildIntelligenceContext(request, memory);
    const plan = planIntelligence(request, memory);

    const facts = await retrieveViaSearch({
      plan,
      regionCode: request.regionCode,
    });

    let narrative: string | null = null;

    if (plan.needs.needAi) {
      try {
        const result = await runWithFailover(
          buildProviderPrompt({
            userText: request.text,
            context,
            plan,
            facts,
          }),
          request.preferredProvider
        );
        providerUsed = result.providerId;
        const parsed = parseProviderText(result.rawText);
        narrative = parsed.narrative || null;
        if (result.attempted.length > 1) {
          warnings.push(`Failover path: ${result.attempted.join(" → ")}`);
        }
      } catch (err) {
        usedFallback = true;
        warnings.push(
          err instanceof Error ? `Provider failed: ${err.message}` : "Provider failed"
        );
        narrative = fallbackNarrative(facts.hits.length);
      }
    } else if (plan.intent !== "greet") {
      // Package / destination / FAQ / static — Search + Knowledge + Renderer only
      narrative = searchOnlyNarrative(facts.hits) ?? fallbackNarrative(0);
      providerUsed = "none";
    }

    let blocks = formatIntelligenceBlocks({
      intent: plan.intent,
      facts,
      narrative,
      usedFallback,
    });

    const validated = validateIntelligenceBlocks(blocks, facts);
    blocks = validated.blocks;
    for (const issue of validated.issues) {
      warnings.push(`${issue.code}: ${issue.message}`);
    }

    const safe = applySafetyRails(blocks, facts);
    blocks = safe.blocks;
    warnings.push(...safe.warnings);

    const durationMs = Date.now() - startedAt;
    endIntelligenceSpan(span);

    const result: IntelligenceResult = {
      success: true,
      intent: plan.intent,
      entities: plan.entities,
      blocks,
      facts,
      plan,
      provider: providerUsed,
      usedFallback,
      warnings,
      traceId,
      durationMs,
      timestamp: new Date().toISOString(),
    };

    logIntelligence({
      level: "info",
      message: "intelligence.complete",
      traceId,
      surface: request.surface,
      intent: plan.intent,
      provider: providerUsed,
      durationMs,
      meta: { usedFallback, hitCount: facts.hits.length },
    });

    recordIntelligenceMetric({
      surface: request.surface,
      intent: plan.intent,
      provider: providerUsed,
      usedFallback,
      durationMs,
      success: true,
    });

    return result;
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : "Intelligence failed";

    logIntelligence({
      level: "error",
      message,
      traceId,
      surface: request.surface,
      durationMs,
    });

    recordIntelligenceMetric({
      surface: request.surface,
      intent: "unknown",
      provider: "none",
      usedFallback: true,
      durationMs,
      success: false,
    });

    // Never fail hard for consumers — return empty fallback DTO.
    return {
      success: false,
      intent: "fallback_browse",
      entities: [],
      blocks: [
        {
          kind: "fallback_browse",
          title: "Unavailable",
          body: "Intelligence temporarily unavailable. Please retry or browse catalog results from Search.",
          refs: [],
          payload: { error: message },
        },
      ],
      facts: { search: null, hits: [], retrievedAt: new Date().toISOString() },
      plan: {
        intent: "fallback_browse",
        entities: [],
        confidence: 0,
        needs: {
          needAi: false,
          needSearch: false,
          needKnowledgeViaSearch: false,
          needQuotation: false,
          needCustomerData: false,
          needTravelMemory: false,
          searchKinds: [],
          searchQueryText: "",
          reason: "error fallback",
        },
      },
      provider: "none",
      usedFallback: true,
      warnings: [message],
      traceId,
      durationMs,
      timestamp: new Date().toISOString(),
    };
  }
}

/** Convenience aliases for future surfaces */
export async function assistWebsite(text: string, extras?: Partial<IntelligenceRequest>) {
  return runIntelligence({ text, surface: "website", ...extras });
}

export async function assistCrm(text: string, extras?: Partial<IntelligenceRequest>) {
  return runIntelligence({ text, surface: "crm", ...extras });
}

export async function assistQuotation(text: string, extras?: Partial<IntelligenceRequest>) {
  return runIntelligence({ text, surface: "quotation", ...extras });
}
