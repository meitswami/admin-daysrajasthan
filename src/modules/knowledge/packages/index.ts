export type { PackageRecord } from "../types";
export { getPackage, getPackageBySlug, listPackages } from "../service";

export const SUBMODULE = {
  parent: "knowledge" as const,
  id: "packages" as const,
  description: "Website packages (itineraries table)",
} as const;
