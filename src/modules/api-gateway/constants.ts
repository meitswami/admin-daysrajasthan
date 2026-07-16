export const DEFAULT_API_VERSION = "v1" as const;

export const GATEWAY_HEADER_TRACE = "x-td-trace-id";
export const GATEWAY_HEADER_VERSION = "x-td-api-version";

/** Default permissive rate limit (in-memory) until Redis backend. */
export const DEFAULT_RATE_LIMIT = {
  windowMs: 60_000,
  maxRequests: 120,
} as const;

export const API_MESSAGES = {
  ok: "OK",
  created: "Created",
  validationFailed: "Validation failed",
  unauthorized: "Unauthorized",
  forbidden: "Forbidden",
  rateLimited: "Rate limit exceeded",
  featureDisabled: "Feature is disabled",
  internalError: "Internal server error",
} as const;
