import { newUuid } from "@/lib/itinerary-builder/defaults";

import { DEFAULT_API_VERSION } from "./constants";
import type {
  ApiErrorItem,
  ApiFailureResponse,
  ApiMetadata,
  ApiPaginationMeta,
  ApiSuccessResponse,
  ApiVersion,
} from "./types";

/**
 * Build success envelope.
 */
export function successResponse<T>(input: {
  data: T;
  message?: string;
  traceId: string;
  routeId: string;
  version?: ApiVersion;
  durationMs: number;
  featureFlags?: Record<string, boolean>;
  pagination?: ApiPaginationMeta | null;
}): ApiSuccessResponse<T> {
  const metadata: ApiMetadata = {
    version: input.version ?? DEFAULT_API_VERSION,
    routeId: input.routeId,
    durationMs: input.durationMs,
    featureFlags: input.featureFlags ?? {},
  };
  return {
    success: true,
    message: input.message ?? "OK",
    data: input.data,
    metadata,
    pagination: input.pagination ?? null,
    errors: null,
    traceId: input.traceId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Build failure envelope.
 */
export function failureResponse(input: {
  message: string;
  errors: ApiErrorItem[];
  traceId: string;
  routeId: string;
  version?: ApiVersion;
  durationMs: number;
  featureFlags?: Record<string, boolean>;
}): ApiFailureResponse {
  return {
    success: false,
    message: input.message,
    data: null,
    metadata: {
      version: input.version ?? DEFAULT_API_VERSION,
      routeId: input.routeId,
      durationMs: input.durationMs,
      featureFlags: input.featureFlags ?? {},
    },
    pagination: null,
    errors: input.errors,
    traceId: input.traceId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a new request trace id.
 */
export function createTraceId(): string {
  return newUuid();
}
