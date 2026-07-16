/**
 * Request logging — OpenTelemetry / Sentry / Datadog ready (no external SDK yet).
 */

export type GatewayLogLevel = "debug" | "info" | "warn" | "error";

export type GatewayLogRecord = {
  level: GatewayLogLevel;
  message: string;
  traceId: string;
  routeId: string;
  durationMs?: number;
  status?: number;
  meta?: Record<string, unknown>;
  timestamp: string;
};

export type GatewayLogger = (record: GatewayLogRecord) => void;

const buffer: GatewayLogRecord[] = [];
const MAX_BUFFER = 200;

const defaultLogger: GatewayLogger = (record) => {
  buffer.push(record);
  if (buffer.length > MAX_BUFFER) buffer.shift();
  // Console sink — replaceable by OTEL/Sentry/Datadog adapters later
  if (record.level === "error") {
    console.error("[api-gateway]", record);
  }
};

let activeLogger: GatewayLogger = defaultLogger;

/** Inject logger backend. */
export function setGatewayLogger(logger: GatewayLogger): void {
  activeLogger = logger;
}

/** Emit a structured log record. */
export function logGateway(record: Omit<GatewayLogRecord, "timestamp">): void {
  activeLogger({ ...record, timestamp: new Date().toISOString() });
}

/** Recent in-memory logs (debug / tests). */
export function listGatewayLogs(): GatewayLogRecord[] {
  return [...buffer];
}
