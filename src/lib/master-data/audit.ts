import type { TeamMember } from "@/types/rbac";
import { getCurrentTeamMember } from "@/lib/rbac/current-user";
import { isSupabaseConfigured } from "@/lib/system/data-mode";
import { logActivity } from "@/lib/system/activity-log";
import type { ActivityAction } from "@/types/system";

export type MasterAuditAction = "create" | "update" | "delete";

const ACTION_MAP: Record<MasterAuditAction, ActivityAction> = {
  create: "master_data_create",
  update: "master_data_update",
  delete: "master_data_delete",
};

/**
 * Full audit trail: local activity log + Supabase td_activity_logs + td_master_data_audit.
 */
export function logMasterDataChange(input: {
  entityType: string;
  entityId: string;
  action: MasterAuditAction;
  summary: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  actor?: TeamMember;
}) {
  const actor = input.actor ?? getCurrentTeamMember();
  const createdAt = new Date().toISOString();

  logActivity({
    action: ACTION_MAP[input.action],
    module: "master_data",
    summary: input.summary,
    entity_type: input.entityType,
    entity_id: input.entityId,
    metadata: {
      before: input.before ?? null,
      after: input.after ?? null,
    },
  });

  if (!isSupabaseConfigured()) return;

  void (async () => {
    try {
      await fetch("/api/system/master-data-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_type: input.entityType,
          entity_id: input.entityId,
          action: input.action,
          summary: input.summary,
          actor_id: actor.id,
          actor_name: actor.name,
          actor_role: actor.role,
          before_data: input.before ?? null,
          after_data: input.after ?? null,
          created_at: createdAt,
        }),
      });
    } catch {
      // Local activity log already retained
    }
  })();
}
