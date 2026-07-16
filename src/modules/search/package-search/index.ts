export { searchPackages } from "../service";

export const SUBMODULE = {
  parent: "search" as const,
  id: "package-search" as const,
  description: "Package discovery via Knowledge Engine",
} as const;
