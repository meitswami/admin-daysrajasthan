export { searchKnowledge } from "../service";

export const SUBMODULE = {
  parent: "search" as const,
  id: "knowledge-search" as const,
  description: "Cross-domain knowledge discovery via Knowledge Engine",
} as const;
