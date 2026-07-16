export { createAssignment, listAssignments } from "../service";

export const SUBMODULE = {
  parent: "customer-relations" as const,
  id: "assignments" as const,
  description: "Team assignment records",
} as const;
