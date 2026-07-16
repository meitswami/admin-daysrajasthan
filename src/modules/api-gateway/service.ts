/**
 * API Gateway service — sole request pipeline for external consumers.
 */

import { ModuleError } from "@/modules/shared";

import { isAuthenticated, resolveActor } from "./auth";
import { API_MESSAGES, GATEWAY_HEADER_TRACE } from "./constants";
import { getFeatureFlagSnapshot, isFeatureEnabled } from "./feature-flags";
import { logGateway } from "./logging";
import { recordMetric } from "./metrics";
import { checkPermission } from "./permissions";
import { checkRateLimit } from "./rate-limit";
import { createTraceId, failureResponse, successResponse } from "./response";
import type { GatewayRouteConfig } from "./types";
import { parseRouteId } from "./validators";
import { resolveApiVersion } from "./versioning";

function jsonResponse(body: unknown, status: number, traceId: string): Response {
  return Response.json(body, {
    status,
    headers: {
      [GATEWAY_HEADER_TRACE]: traceId,
      "content-type": "application/json",
    },
  });
}

async function readJsonBody(request: Request): Promise<unknown> {
  if (request.method === "GET" || request.method === "HEAD") {
    const url = new URL(request.url);
    const entries = Object.fromEntries(url.searchParams.entries());
    return entries;
  }
  try {
    return await request.json();
  } catch {
    return {};
  }
}

/**
 * Execute the full gateway pipeline and return a Next/Fetch Response.
 *
 * Lifecycle: Client → Validate → Auth → AuthZ → Rate limit → Feature flags
 * → Logging/Metrics → Handler (module services) → Standard response
 */
export async function runGateway<TInput, TData>(
  request: Request,
  config: GatewayRouteConfig<TInput, TData>
): Promise<Response> {
  const startedAt = Date.now();
  const traceId = request.headers.get(GATEWAY_HEADER_TRACE) ?? createTraceId();
  const routeId = parseRouteId(config.routeId);
  const version = resolveApiVersion(request, config.version);
  const authMode = config.auth ?? "anonymous";
  const path = new URL(request.url).pathname;
  const featureFlags = getFeatureFlagSnapshot(config.featureFlag);

  const fail = (status: number, message: string, errors: { code: string; message: string; field?: string; details?: unknown }[]) => {
    const durationMs = Date.now() - startedAt;
    recordMetric(routeId, durationMs, true);
    logGateway({
      level: status >= 500 ? "error" : "warn",
      message,
      traceId,
      routeId,
      durationMs,
      status,
    });
    return jsonResponse(
      failureResponse({
        message,
        errors,
        traceId,
        routeId,
        version,
        durationMs,
        featureFlags,
      }),
      status,
      traceId
    );
  };

  try {
    if (config.featureFlag && !isFeatureEnabled(config.featureFlag)) {
      return fail(403, API_MESSAGES.featureDisabled, [
        { code: "FEATURE_DISABLED", message: `Flag disabled: ${config.featureFlag}` },
      ]);
    }

    const actor = await resolveActor(request, authMode);
    if (!isAuthenticated(actor, authMode)) {
      return fail(401, API_MESSAGES.unauthorized, [
        { code: "UNAUTHORIZED", message: "Authentication required" },
      ]);
    }

    const allowed = await checkPermission(actor, config.permission ?? null);
    if (!allowed) {
      return fail(403, API_MESSAGES.forbidden, [
        { code: "FORBIDDEN", message: `Missing permission: ${config.permission}` },
      ]);
    }

    const rateKey = config.rateLimitKey ?? `${routeId}:${actor.id ?? request.headers.get("x-forwarded-for") ?? "anon"}`;
    const rate = await checkRateLimit(rateKey);
    if (!rate.allowed) {
      return fail(429, API_MESSAGES.rateLimited, [
        {
          code: "RATE_LIMITED",
          message: `Retry after ${rate.retryAfterMs}ms`,
          details: { remaining: rate.remaining, retryAfterMs: rate.retryAfterMs },
        },
      ]);
    }

    const raw = await readJsonBody(request);
    let input = raw as TInput;
    if (config.schema) {
      const parsed = config.schema.safeParse(raw);
      if (!parsed.success) {
        return fail(422, API_MESSAGES.validationFailed, [
          {
            code: "VALIDATION_ERROR",
            message: parsed.error.message ?? "Invalid payload",
            details: parsed.error.flatten(),
          },
        ]);
      }
      input = parsed.data;
    }

    const ctx = {
      traceId,
      routeId,
      version,
      method: request.method,
      path,
      actor,
      input,
      featureFlags,
      startedAt,
    };

    const result = await config.handler(ctx);
    const durationMs = Date.now() - startedAt;
    recordMetric(routeId, durationMs, false);
    logGateway({
      level: "info",
      message: "request.ok",
      traceId,
      routeId,
      durationMs,
      status: result.status ?? 200,
      meta: { authMode, actorId: actor.id },
    });

    return jsonResponse(
      successResponse({
        data: result.data,
        message: result.message ?? API_MESSAGES.ok,
        traceId,
        routeId,
        version,
        durationMs,
        featureFlags,
        pagination: result.pagination ?? null,
      }),
      result.status ?? 200,
      traceId
    );
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    if (error instanceof ModuleError) {
      return fail(400, error.message, [{ code: error.code, message: error.message }]);
    }
    return fail(500, API_MESSAGES.internalError, [
      {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    ]);
  }
}
