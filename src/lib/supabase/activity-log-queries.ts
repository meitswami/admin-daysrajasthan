import type { ActivityLogEntry, ActivityAction } from "@/types/system";
import { createClient } from "@/lib/supabase/server";

export async function insertActivityLogToSupabase(
  entry: Omit<ActivityLogEntry, "id"> & { id?: string }
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("td_activity_logs").insert({
    id: entry.id?.startsWith("act-") ? undefined : entry.id,
    action: entry.action,
    module: entry.module,
    entity_type: entry.entity_type,
    entity_id: entry.entity_id,
    summary: entry.summary,
    actor_id: entry.actor_id,
    actor_name: entry.actor_name,
    actor_role: entry.actor_role,
    ip_address: entry.ip_address,
    metadata: entry.metadata,
    created_at: entry.created_at,
  });
  if (error) throw error;
}

export async function fetchActivityLogsFromSupabase(opts?: {
  limit?: number;
  module?: string;
  action?: ActivityAction;
}): Promise<ActivityLogEntry[]> {
  const supabase = await createClient();
  let query = supabase
    .from("td_activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 200);

  if (opts?.module) query = query.eq("module", opts.module);
  if (opts?.action) query = query.eq("action", opts.action);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    action: row.action as ActivityAction,
    module: row.module,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    summary: row.summary,
    actor_id: row.actor_id ?? "",
    actor_name: row.actor_name ?? "System",
    actor_role: row.actor_role ?? "staff",
    ip_address: row.ip_address,
    metadata: row.metadata as Record<string, unknown> | null,
    created_at: row.created_at,
  }));
}
