import type { IntelligenceMetricSample } from "../types";

const samples: IntelligenceMetricSample[] = [];
const MAX_SAMPLES = 500;

export function recordIntelligenceMetric(sample: IntelligenceMetricSample): void {
  samples.push(sample);
  if (samples.length > MAX_SAMPLES) samples.shift();
}

export function getIntelligenceMetricsSnapshot(): {
  count: number;
  failureRate: number;
  avgLatencyMs: number;
  fallbackRate: number;
  recent: IntelligenceMetricSample[];
} {
  const count = samples.length;
  if (!count) {
    return { count: 0, failureRate: 0, avgLatencyMs: 0, fallbackRate: 0, recent: [] };
  }
  const failures = samples.filter((s) => !s.success).length;
  const fallbacks = samples.filter((s) => s.usedFallback).length;
  const avgLatencyMs = samples.reduce((a, s) => a + s.durationMs, 0) / count;
  return {
    count,
    failureRate: failures / count,
    avgLatencyMs,
    fallbackRate: fallbacks / count,
    recent: samples.slice(-20),
  };
}

/** Hooks for future OpenTelemetry spans. */
export function startIntelligenceSpan(name: string): { name: string; startedAt: number } {
  return { name, startedAt: Date.now() };
}

export function endIntelligenceSpan(span: { name: string; startedAt: number }): number {
  return Date.now() - span.startedAt;
}

export const SUBMODULE = {
  parent: "intelligence" as const,
  id: "telemetry" as const,
  description: "Latency / success / fallback metrics (future OTEL dashboard)",
} as const;
