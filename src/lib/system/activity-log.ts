import type { ActivityAction, ActivityLogEntry } from "@/types/system";
import { getCurrentTeamMember } from "@/lib/rbac/current-user";
import { isRealDataMode, isSupabaseConfigured } from "@/lib/system/data-mode";

const LOG_KEY = "td-activity-log-v1";
const MAX_ENTRIES = 1000;

function load(): ActivityLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? (JSON.parse(raw) as ActivityLogEntry[]) : [];
  } catch {
    return [];
  }
}

function save(entries: ActivityLogEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOG_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

async function persistToServer(entry: ActivityLogEntry) {
  if (!isSupabaseConfigured()) return;
  try {
    await fetch("/api/system/activity-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: entry.action,
        module: entry.module,
        summary: entry.summary,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        actor_id: entry.actor_id,
        actor_name: entry.actor_name,
        actor_role: entry.actor_role,
        metadata: entry.metadata,
        created_at: entry.created_at,
      }),
    });
  } catch {
    // Local log remains authoritative offline
  }
}

export function logActivity(input: {
  action: ActivityAction;
  module: string;
  summary: string;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const actor = getCurrentTeamMember();
  const entry: ActivityLogEntry = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    action: input.action,
    module: input.module,
    entity_type: input.entity_type ?? null,
    entity_id: input.entity_id ?? null,
    summary: input.summary,
    actor_id: actor.id,
    actor_name: actor.name,
    actor_role: actor.role,
    ip_address: null,
    metadata: input.metadata ?? null,
    created_at: new Date().toISOString(),
  };
  save([entry, ...load()]);
  void persistToServer(entry);
  return entry;
}

export function listActivityLogs(opts?: {
  limit?: number;
  module?: string;
  action?: ActivityAction;
}): ActivityLogEntry[] {
  let entries = load();
  if (opts?.module) entries = entries.filter((e) => e.module === opts.module);
  if (opts?.action) entries = entries.filter((e) => e.action === opts.action);
  const limit = opts?.limit ?? 200;
  return entries.slice(0, limit);
}

export async function fetchActivityLogsMerged(opts?: {
  limit?: number;
  module?: string;
  action?: ActivityAction;
}): Promise<ActivityLogEntry[]> {
  const local = listActivityLogs(opts);

  if (!isRealDataMode() || !isSupabaseConfigured()) return local;

  try {
    const params = new URLSearchParams();
    params.set("limit", String(opts?.limit ?? 200));
    if (opts?.module) params.set("module", opts.module);
    if (opts?.action) params.set("action", opts.action);

    const res = await fetch(`/api/system/activity-log?${params.toString()}`);
    if (!res.ok) return local;
    const data = (await res.json()) as { logs?: ActivityLogEntry[] };
    const remote = data.logs ?? [];
    if (remote.length === 0) return local;

    const byId = new Map<string, ActivityLogEntry>();
    for (const e of [...remote, ...local]) byId.set(e.id, e);
    return [...byId.values()]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, opts?.limit ?? 200);
  } catch {
    return local;
  }
}

export function getActivityLogsForEntity(entityId: string) {
  return load().filter((e) => e.entity_id === entityId);
}
