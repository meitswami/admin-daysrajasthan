/**
 * Top-level module registry for TravelDays feature architecture.
 * Existing app routes under (dashboard) remain active until Phase 1 migration.
 */
export { MODULE_IDS, MODULE_MANIFESTS, getModuleManifest, isDependencyAllowed } from "./shared";
export type { ModuleId, ModuleManifest } from "./shared";
export { ModuleError } from "./shared";

export { moduleManifest as intelligenceManifest } from "./intelligence";
export { moduleManifest as chatManifest } from "./chat";
export { moduleManifest as knowledgeManifest } from "./knowledge";
export { moduleManifest as searchManifest } from "./search";
export { moduleManifest as rendererManifest } from "./renderer";
export { moduleManifest as designSystemManifest } from "./design-system";
export { moduleManifest as itineraryManifest } from "./itinerary";
export { moduleManifest as packagesManifest } from "./packages";
export { moduleManifest as destinationsManifest } from "./destinations";
export { moduleManifest as crmManifest } from "./crm";
export { moduleManifest as customerRelationsManifest } from "./customer-relations";
export { moduleManifest as analyticsManifest } from "./analytics";
export { moduleManifest as authManifest } from "./auth";
export { moduleManifest as quotationManifest } from "./quotation";
export { moduleManifest as customerManifest } from "./customer";
export { moduleManifest as teamManifest } from "./team";
export { moduleManifest as notificationsManifest } from "./notifications";
export { moduleManifest as apiGatewayManifest } from "./api-gateway";
