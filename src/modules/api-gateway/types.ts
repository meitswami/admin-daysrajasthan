/**
 * Universal API Gateway — request/response contracts.
 */

export type ApiVersion = "v1" | "v2";

export type AuthMode = "anonymous" | "session" | "service";

export type ApiErrorItem = {
  code: string;
  message: string;
  field?: string;
  details?: unknown;
};

export type ApiPaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  nextCursor: string | null;
};

export type ApiMetadata = {
  version: ApiVersion;
  routeId: string;
  durationMs: number;
  featureFlags: Record<string, boolean>;
  [key: string]: unknown;
};

export type ApiSuccessResponse<T> = {
  success: true;
  message: string;
  data: T;
  metadata: ApiMetadata;
  pagination: ApiPaginationMeta | null;
  errors: null;
  traceId: string;
  timestamp: string;
};

export type ApiFailureResponse = {
  success: false;
  message: string;
  data: null;
  metadata: ApiMetadata;
  pagination: null;
  errors: ApiErrorItem[];
  traceId: string;
  timestamp: string;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiFailureResponse;

export type GatewayActor = {
  id: string | null;
  email: string | null;
  roles: string[];
  authMode: AuthMode;
};

export type GatewayContext<TInput = unknown> = {
  traceId: string;
  routeId: string;
  version: ApiVersion;
  method: string;
  path: string;
  actor: GatewayActor;
  input: TInput;
  featureFlags: Record<string, boolean>;
  startedAt: number;
};

export type GatewayHandlerResult<TData> = {
  data: TData;
  message?: string;
  pagination?: ApiPaginationMeta | null;
  status?: number;
};

export type GatewayRouteConfig<TInput, TData> = {
  routeId: string;
  version?: ApiVersion;
  auth?: AuthMode;
  /** Permission key checked after auth (skip when anonymous). */
  permission?: string | null;
  /** Feature flag gate (must be enabled). */
  featureFlag?: string | null;
  /** Optional Zod-like safeParse schema. */
  schema?: {
    safeParse: (input: unknown) =>
      | { success: true; data: TInput }
      | { success: false; error: { flatten: () => unknown; message?: string } };
  };
  rateLimitKey?: string | null;
  handler: (ctx: GatewayContext<TInput>) => Promise<GatewayHandlerResult<TData>>;
};
