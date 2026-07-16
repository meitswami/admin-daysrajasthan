/** Knowledge domain: activities — DTO contract only (no queries yet). */
export type { ActivityRecord } from "../types";

export const SUBMODULE = {
  parent: "knowledge" as const,
  id: "activities" as const,
  description: "Activities knowledge",
} as const;
