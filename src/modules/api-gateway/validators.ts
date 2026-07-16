import { ModuleError } from "@/modules/shared";

import { apiVersionSchema, gatewayRouteIdSchema } from "./schemas";
import type { ApiVersion } from "./types";

/**
 * Validate API version string.
 */
export function parseApiVersion(value: unknown): ApiVersion {
  const result = apiVersionSchema.safeParse(value ?? "v1");
  if (!result.success) {
    throw new ModuleError("api-gateway", "INVALID_VERSION", "Unsupported API version");
  }
  return result.data;
}

/**
 * Validate route id.
 */
export function parseRouteId(value: unknown): string {
  const result = gatewayRouteIdSchema.safeParse(value);
  if (!result.success) {
    throw new ModuleError("api-gateway", "INVALID_ROUTE", "Invalid route id");
  }
  return result.data;
}
