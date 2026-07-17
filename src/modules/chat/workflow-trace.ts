/**
 * Opt-in testing workflow tracer for chat turns.
 * Only active when ChatPlatformSettings.testingWorkflowTrace === true.
 */

export type WorkflowStepStatus = "ok" | "skip" | "error";

export type WorkflowStep = {
  name: string;
  status: WorkflowStepStatus;
  at: string;
  durationMs: number;
  detail?: string;
  meta?: Record<string, unknown>;
};

export type PackageHitSummary = {
  package_id: string;
  name: string;
  destination: string | null;
  duration: string | null;
  slug: string | null;
  score: number;
};

export type ChatWorkflowTrace = {
  id: string;
  sessionId: string;
  conversationId: string | null;
  websiteId: string | null;
  messageId: string | null;
  userMessage: string;
  replyPreview: string | null;
  provider: string | null;
  modelId: string | null;
  intent: string | null;
  usedFallback: boolean;
  aiMode: string | null;
  packageHitCount: number;
  totalHitCount: number;
  packageIds: string[];
  packageSummaries: PackageHitSummary[];
  steps: WorkflowStep[];
  durationMs: number;
  traceId: string | null;
  createdAt: string;
};

export class WorkflowTracer {
  private readonly startedAt: number;
  private stepStartedAt: number;
  readonly steps: WorkflowStep[] = [];
  readonly id: string;
  readonly createdAt: string;

  constructor(id?: string) {
    this.id =
      id ??
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0")}`);
    this.startedAt = Date.now();
    this.stepStartedAt = this.startedAt;
    this.createdAt = new Date().toISOString();
  }

  /** Mark the end of the previous open step window and start a named step. */
  mark(
    name: string,
    status: WorkflowStepStatus = "ok",
    detail?: string,
    meta?: Record<string, unknown>
  ): void {
    const now = Date.now();
    this.steps.push({
      name,
      status,
      at: new Date(now).toISOString(),
      durationMs: Math.max(0, now - this.stepStartedAt),
      detail,
      meta,
    });
    this.stepStartedAt = now;
  }

  totalMs(): number {
    return Date.now() - this.startedAt;
  }
}

const g = globalThis as typeof globalThis & {
  __tdWorkflowTraces?: ChatWorkflowTrace[];
};

function memoryStore(): ChatWorkflowTrace[] {
  if (!g.__tdWorkflowTraces) g.__tdWorkflowTraces = [];
  return g.__tdWorkflowTraces;
}

export function rememberWorkflowTrace(trace: ChatWorkflowTrace): void {
  const store = memoryStore();
  store.unshift(trace);
  if (store.length > 80) store.length = 80;
}

export function listRememberedWorkflowTraces(filters?: {
  sessionId?: string;
  conversationId?: string;
  limit?: number;
}): ChatWorkflowTrace[] {
  const limit = filters?.limit ?? 40;
  return memoryStore()
    .filter((t) => {
      if (filters?.sessionId && t.sessionId !== filters.sessionId) return false;
      if (filters?.conversationId && t.conversationId !== filters.conversationId) return false;
      return true;
    })
    .slice(0, limit);
}

export function buildPackageSummaries(
  hits: Array<{
    kind: string;
    id: string;
    title: string;
    score: number;
    record?: {
      id?: string;
      name?: string;
      destination?: string | null;
      duration?: string | null;
      slug?: string | null;
    };
  }>
): PackageHitSummary[] {
  return hits
    .filter((h) => h.kind === "package")
    .map((h) => ({
      package_id: h.record?.id ?? h.id,
      name: h.record?.name ?? h.title,
      destination: h.record?.destination ?? null,
      duration: h.record?.duration ?? null,
      slug: h.record?.slug ?? null,
      score: h.score,
    }));
}
