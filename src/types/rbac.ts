export type TeamRole =
  | "superadmin"
  | "admin"
  | "sales_admin"
  | "sales"
  | "finance"
  | "operations"
  | "accounts"
  | "staff";

/** Primary roles shown in the Super Admin toggle matrix */
export const PRIMARY_ROLES: TeamRole[] = [
  "superadmin",
  "admin",
  "sales_admin",
  "sales",
  "finance",
];

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
  | "data_mode.toggle"
  | "master_data.view"
  | "master_data.create"
  | "master_data.edit_own"
  | "master_data.edit_any"
  | "master_data.delete_own"
  | "master_data.delete_any"
  | "operations.view";

export const ALL_PERMISSION_KEYS: PermissionKey[] = [
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
  "master_data.view",
  "master_data.create",
  "master_data.edit_own",
  "master_data.edit_any",
  "master_data.delete_own",
  "master_data.delete_any",
  "operations.view",
];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  "dashboard.view": "Dashboard",
  "itinerary_builder.view": "Itinerary builder — view",
  "itinerary_builder.create": "Itinerary builder — create",
  "itinerary_builder.edit": "Itinerary builder — edit",
  "itinerary_builder.approve": "Itinerary builder — approve",
  "itinerary_builder.delete": "Itinerary builder — delete",
  "email.view": "Email — view",
  "email.send": "Email — send",
  "crm.view": "CRM — view",
  "crm.leads": "CRM — leads",
  "reports.view": "Reports — view",
  "reports.export": "Reports — export",
  "settings.view": "Settings — view",
  "settings.system": "Settings — system & RBAC",
  "chat.manage": "Chat — manage",
  "team.manage": "Team — manage",
  "activity_logs.view": "Activity logs",
  "data_mode.toggle": "Data mode toggle",
  "master_data.view": "Master data — view",
  "master_data.create": "Master data — create",
  "master_data.edit_own": "Master data — edit own",
  "master_data.edit_any": "Master data — edit any",
  "master_data.delete_own": "Master data — delete own",
  "master_data.delete_any": "Master data — delete any",
  "operations.view": "Operations — transport, sheets, P&L, invoices",
};

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  mfa_enabled: boolean;
  mfa_locked: boolean;
  is_active: boolean;
  created_at: string;
  /** When set, replaces role defaults for this member only */
  permission_overrides?: PermissionKey[] | null;
}

/** Grouped permissions for Staff Management UI */
export const PERMISSION_GROUPS: { id: string; label: string; keys: PermissionKey[] }[] = [
  {
    id: "access",
    label: "Access",
    keys: ["dashboard.view", "settings.view", "settings.system", "data_mode.toggle"],
  },
  {
    id: "booking",
    label: "Booking & Itineraries",
    keys: [
      "itinerary_builder.view",
      "itinerary_builder.create",
      "itinerary_builder.edit",
      "itinerary_builder.approve",
      "itinerary_builder.delete",
    ],
  },
  {
    id: "crm",
    label: "CRM & Email",
    keys: ["crm.view", "crm.leads", "email.view", "email.send", "chat.manage"],
  },
  {
    id: "master",
    label: "Master Data",
    keys: [
      "master_data.view",
      "master_data.create",
      "master_data.edit_own",
      "master_data.edit_any",
      "master_data.delete_own",
      "master_data.delete_any",
    ],
  },
  {
    id: "ops",
    label: "Operations & Finance",
    keys: ["operations.view", "reports.view", "reports.export"],
  },
  {
    id: "team",
    label: "Team & Audit",
    keys: ["team.manage", "activity_logs.view"],
  },
];

export const ROLE_LABELS: Record<TeamRole, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  sales_admin: "Sales Admin",
  sales: "Sales",
  finance: "Finance",
  operations: "Operations",
  accounts: "Accounts",
  staff: "Staff",
};

const MASTER_DATA_FULL: PermissionKey[] = [
  "master_data.view",
  "master_data.create",
  "master_data.edit_own",
  "master_data.edit_any",
  "master_data.delete_own",
  "master_data.delete_any",
];

const MASTER_DATA_OWN: PermissionKey[] = [
  "master_data.view",
  "master_data.create",
  "master_data.edit_own",
  "master_data.delete_own",
];

/** Role → permissions matrix (defaults; Super Admin can override via Settings) */
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
    ...MASTER_DATA_FULL,
    "operations.view",
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
    ...MASTER_DATA_FULL,
    "operations.view",
  ],
  sales_admin: [
    "dashboard.view",
    "itinerary_builder.view",
    "itinerary_builder.create",
    "itinerary_builder.edit",
    "email.view",
    "email.send",
    "crm.view",
    "crm.leads",
    "reports.view",
    "settings.view",
    ...MASTER_DATA_OWN,
    "operations.view",
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
    "master_data.view",
    "operations.view",
  ],
  finance: [
    "dashboard.view",
    "itinerary_builder.view",
    "itinerary_builder.edit",
    "itinerary_builder.approve",
    "email.view",
    "reports.view",
    "reports.export",
    "master_data.view",
    "operations.view",
  ],
  operations: [
    "dashboard.view",
    "itinerary_builder.view",
    "itinerary_builder.edit",
    "crm.view",
    "reports.view",
    "master_data.view",
    "operations.view",
  ],
  accounts: [
    "dashboard.view",
    "itinerary_builder.view",
    "itinerary_builder.edit",
    "itinerary_builder.approve",
    "email.view",
    "reports.view",
    "reports.export",
    "master_data.view",
    "operations.view",
  ],
  staff: ["dashboard.view", "itinerary_builder.view", "crm.view", "master_data.view"],
};

export type RbacPermissionOverrides = Partial<Record<TeamRole, PermissionKey[]>>;
