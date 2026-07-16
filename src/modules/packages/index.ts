import { getModuleManifest } from "@/modules/shared";

export const moduleManifest = getModuleManifest("packages");

export type { CmsPackage, KnowledgeListFilters, PackageRecord } from "./types";
export { cmsPackageListFiltersSchema } from "./schemas";
export { CMS_PACKAGES_SOURCE_TABLE } from "./constants";
export { parseCmsPackageFilters } from "./validators";
export {
  getCmsPackage,
  getCmsPackageBySlug,
  listCmsPackages,
  listPackageRecords,
} from "./service";
