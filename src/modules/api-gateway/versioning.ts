/**
 * API versioning helpers.
 */

import { DEFAULT_API_VERSION, GATEWAY_HEADER_VERSION } from "./constants";
import type { ApiVersion } from "./types";
import { parseApiVersion } from "./validators";

/**
 * Resolve API version from config or request header.
 */
export function resolveApiVersion(
  request: Request,
  configured?: ApiVersion
): ApiVersion {
  if (configured) return configured;
  const header = request.headers.get(GATEWAY_HEADER_VERSION);
  if (header) return parseApiVersion(header);
  return DEFAULT_API_VERSION;
}

/**
 * Whether a version is supported.
 */
export function isSupportedVersion(version: ApiVersion): boolean {
  return version === "v1" || version === "v2";
}
