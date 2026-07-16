export { searchLeads } from "../service";

export const SUBMODULE = {
  parent: "search" as const,
  id: "lead-search" as const,
  description: "Lead discovery via Customer Relationship Platform",
} as const;
