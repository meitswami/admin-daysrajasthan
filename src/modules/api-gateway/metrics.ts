/**
 * Gateway metrics — request count, latency, failures (dashboard-ready).
 */

export type RouteMetrics = {
  routeId: string;
  requestCount: number;
  failureCount: number;
  totalLatencyMs: number;
};

const metrics = new Map<string, RouteMetrics>();

/**
 * Record a completed request.
 */
export function recordMetric(routeId: string, durationMs: number, failed: boolean): void {
  const current = metrics.get(routeId) ?? {
    routeId,
    requestCount: 0,
    failureCount: 0,
    totalLatencyMs: 0,
  };
  current.requestCount += 1;
  current.totalLatencyMs += durationMs;
  if (failed) current.failureCount += 1;
  metrics.set(routeId, current);
}

/**
 * Snapshot metrics for dashboards.
 */
export function getMetricsSnapshot(): Array<
  RouteMetrics & { avgLatencyMs: number; failureRate: number }
> {
  return [...metrics.values()].map((m) => ({
    ...m,
    avgLatencyMs: m.requestCount ? Math.round(m.totalLatencyMs / m.requestCount) : 0,
    failureRate: m.requestCount ? m.failureCount / m.requestCount : 0,
  }));
}

/** Reset metrics (tests). */
export function resetMetrics(): void {
  metrics.clear();
}
