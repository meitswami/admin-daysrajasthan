export { searchAdmin, searchGlobal } from "../service";

export const SUBMODULE = {
  parent: "search" as const,
  id: "global-search" as const,
  description: "Cross-module aggregated search",
} as const;
