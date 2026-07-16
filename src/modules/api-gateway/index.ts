import { getModuleManifest } from "@/modules/shared";

export const moduleManifest = getModuleManifest("api-gateway");

export type {
  ApiErrorItem,
  ApiFailureResponse,
  ApiMetadata,
  ApiPaginationMeta,
  ApiResponse,
  ApiSuccessResponse,
  ApiVersion,
  AuthMode,
  GatewayActor,
  GatewayContext,
  GatewayHandlerResult,
  GatewayRouteConfig,
} from "./types";

export {
  API_MESSAGES,
  DEFAULT_API_VERSION,
  DEFAULT_RATE_LIMIT,
  GATEWAY_HEADER_TRACE,
  GATEWAY_HEADER_VERSION,
} from "./constants";

export { apiVersionSchema, authModeSchema, gatewayRouteIdSchema } from "./schemas";
export { parseApiVersion, parseRouteId } from "./validators";

export { createTraceId, failureResponse, successResponse } from "./response";

export {
  defaultAuthResolver,
  isAuthenticated,
  resolveActor,
  setAuthResolver,
  type AuthResolver,
} from "./auth";

export {
  checkPermission,
  defaultPermissionChecker,
  setPermissionChecker,
  type PermissionChecker,
} from "./permissions";

export {
  getFeatureFlagSnapshot,
  isFeatureEnabled,
  setFeatureFlag,
} from "./feature-flags";

export {
  listGatewayLogs,
  logGateway,
  setGatewayLogger,
  type GatewayLogLevel,
  type GatewayLogRecord,
  type GatewayLogger,
} from "./logging";

export { getMetricsSnapshot, recordMetric, resetMetrics } from "./metrics";

export {
  checkRateLimit,
  memoryRateLimiter,
  setRateLimiter,
  type RateLimitResult,
  type RateLimiter,
} from "./rate-limit";

export { isSupportedVersion, resolveApiVersion } from "./versioning";

export {
  passthroughMiddleware,
  runMiddlewareChain,
  type GatewayMiddleware,
} from "./middleware";

export { runGateway } from "./service";
