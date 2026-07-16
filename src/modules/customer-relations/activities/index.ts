/** Activity aggregation is produced by service lifecycle / communication actions. */
export type { ActivityRecord } from "../types";

export const SUBMODULE = {
  parent: "customer-relations" as const,
  id: "activities" as const,
  description: "Activity aggregation",
} as const;
