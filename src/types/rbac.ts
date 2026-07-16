export type TeamRole =
  | "superadmin"
  | "admin"
  | "sales"
  | "operations"
  | "accounts"
  | "staff";

export type PermissionKey =
  | "dashboard.view"
  | "itinerary_builder.view"
  | "itinerary_builder.create"
  | "itinerary_builder.edit"
  | "itinerary_builder.approve"
  | "itinerary_builder.delete"
  | "email.view"
  | "email.send"
  | "crm.view"
  | "crm.leads"
  | "reports.view"
  | "reports.export"
  | "settings.view"
  | "settings.system"
  | "chat.manage"
  | "team.manage"
  | "activity_logs.view"
  | "data_mode.toggle";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  mfa_enabled: boolean;
  mfa_locked: boolean;
  is_active: boolean;
  created_at: string;
}

export const ROLE_LABELS: Record<TeamRole, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  sales: "Sales",
  operations: "Operations",
  accounts: "Accounts",
  staff: "Staff",
};

/** Role → permissions matrix */
export const ROLE_PERMISSIONS: Record<TeamRole, PermissionKey[]> = {
  superadmin: [
    "dashboard.view",
    "itinerary_builder.view",
    "itinerary_builder.create",
    "itinerary_builder.edit",
    "itinerary_builder.approve",
    "itinerary_builder.delete",
    "email.view",
    "email.send",
    "crm.view",
    "crm.leads",
    "reports.view",
    "reports.export",
    "settings.view",
    "settings.system",
    "chat.manage",
    "team.manage",
    "activity_logs.view",
    "data_mode.toggle",
  ],
  admin: [
    "dashboard.view",
    "itinerary_builder.view",
    "itinerary_builder.create",
    "itinerary_builder.edit",
    "itinerary_builder.approve",
    "itinerary_builder.delete",
    "email.view",
    "email.send",
    "crm.view",
    "crm.leads",
    "reports.view",
    "reports.export",
    "settings.view",
    "chat.manage",
    "team.manage",
    "activity_logs.view",
  ],
  sales: [
    "dashboard.view",
    "itinerary_builder.view",
    "itinerary_builder.create",
    "itinerary_builder.edit",
    "email.view",
    "email.send",
    "crm.view",
    "crm.leads",
    "reports.view",
  ],
  operations: [
    "dashboard.view",
    "itinerary_builder.view",
    "itinerary_builder.edit",
    "crm.view",
    "reports.view",
  ],
  accounts: [
    "dashboard.view",
    "itinerary_builder.view",
    "itinerary_builder.edit",
    "itinerary_builder.approve",
    "email.view",
    "reports.view",
    "reports.export",
  ],
  staff: ["dashboard.view", "itinerary_builder.view", "crm.view"],
};
