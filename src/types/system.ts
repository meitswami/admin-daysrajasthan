export type DataMode = "dummy" | "real";

export type ActivityAction =
  | "login"
  | "logout"
  | "quote_create"
  | "quote_update"
  | "quote_delete"
  | "pricing_change"
  | "email_send"
  | "payment_update"
  | "workflow_change"
  | "settings_change"
  | "data_mode_change"
  | "lead_convert"
  | "mfa_enable"
  | "mfa_disable"
  | "master_data_create"
  | "master_data_update"
  | "master_data_delete";

export interface ActivityLogEntry {
  id: string;
  action: ActivityAction;
  module: string;
  entity_type: string | null;
  entity_id: string | null;
  summary: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  ip_address: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
