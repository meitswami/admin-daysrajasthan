/**
 * Module boundary contracts for TravelDays feature architecture.
 * Enforces allowed dependency direction at the type / documentation level.
 */

export const MODULE_IDS = [
  "intelligence",
  "chat",
  "knowledge",
  "search",
  "renderer",
  "design-system",
  "itinerary",
  "packages",
  "destinations",
  "crm",
  "customer-relations",
  "analytics",
  "auth",
  "quotation",
  "customer",
  "team",
  "notifications",
  "api-gateway",
  "shared",
] as const;

export type ModuleId = (typeof MODULE_IDS)[number];

export type ModuleManifest = {
  readonly id: ModuleId;
  readonly description: string;
  /** Modules this module may import from. `shared` and infra (`lib`) are always allowed. */
  readonly allowedDependencies: readonly ModuleId[];
};

/** Approved dependency graph from ARCHITECTURE.md */
export const MODULE_MANIFESTS: Record<ModuleId, ModuleManifest> = {
  shared: {
    id: "shared",
    description: "Cross-cutting types, errors, and helpers",
    allowedDependencies: [],
  },
  "design-system": {
    id: "design-system",
    description: "Royal Rajasthan theme, tokens, icons, animations, cards",
    allowedDependencies: ["shared"],
  },
  knowledge: {
    id: "knowledge",
    description: "Sole Supabase domain query layer for travel facts",
    allowedDependencies: ["shared"],
  },
  search: {
    id: "search",
    description: "Universal Search Engine; hydrates via Knowledge / CRP / Quotation",
    allowedDependencies: ["knowledge", "customer-relations", "quotation", "shared"],
  },
  intelligence: {
    id: "intelligence",
    description: "Travel decision brain — Search only (never Supabase / never Knowledge-direct)",
    allowedDependencies: ["search", "shared"],
  },
  renderer: {
    id: "renderer",
    description: "Universal Renderer — DTOs → presentation models (React/PDF/email/WhatsApp/JSON)",
    allowedDependencies: ["design-system", "shared"],
  },
  chat: {
    id: "chat",
    description: "Chat Platform — widget management, embed, keys; Intelligence later",
    allowedDependencies: ["intelligence", "renderer", "design-system", "shared"],
  },
  itinerary: {
    id: "itinerary",
    description: "Generate, persist, and share itineraries",
    allowedDependencies: ["knowledge", "intelligence", "renderer", "shared"],
  },
  packages: {
    id: "packages",
    description: "Admin/CMS package workflows",
    allowedDependencies: ["knowledge", "shared"],
  },
  destinations: {
    id: "destinations",
    description: "Admin destination workflows",
    allowedDependencies: ["knowledge", "shared"],
  },
  crm: {
    id: "crm",
    description: "Legacy CRM alias — prefer customer-relations",
    allowedDependencies: ["customer-relations", "knowledge", "shared", "intelligence"],
  },
  "customer-relations": {
    id: "customer-relations",
    description: "Customer Relationship Platform — full customer lifecycle",
    allowedDependencies: ["knowledge", "quotation", "shared"],
  },
  analytics: {
    id: "analytics",
    description: "Reports and activity aggregates",
    allowedDependencies: ["shared"],
  },
  auth: {
    id: "auth",
    description: "Session, roles, demo fallback",
    allowedDependencies: ["shared"],
  },
  quotation: {
    id: "quotation",
    description: "Cost engine, revisions, share/accept",
    allowedDependencies: ["knowledge", "renderer", "shared", "intelligence"],
  },
  customer: {
    id: "customer",
    description: "Customer portal domain",
    allowedDependencies: ["quotation", "renderer", "auth", "shared"],
  },
  team: {
    id: "team",
    description: "Team RBAC helpers and mailbox domain",
    allowedDependencies: ["auth", "quotation", "crm", "shared"],
  },
  notifications: {
    id: "notifications",
    description: "Email / WhatsApp / in-app notifications",
    allowedDependencies: ["shared", "renderer"],
  },
  "api-gateway": {
    id: "api-gateway",
    description: "Universal API Gateway — sole external entry pipeline",
    allowedDependencies: ["shared", "auth"],
  },
};

export function getModuleManifest(id: ModuleId): ModuleManifest {
  return MODULE_MANIFESTS[id];
}

export function isDependencyAllowed(from: ModuleId, to: ModuleId): boolean {
  if (to === "shared") return true;
  if (from === to) return true;
  return MODULE_MANIFESTS[from].allowedDependencies.includes(to);
}
