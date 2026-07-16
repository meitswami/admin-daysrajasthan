/** Knowledge domain: foods — DTO contract only (no queries yet). */
export type { FoodRecord } from "../types";

export const SUBMODULE = {
  parent: "knowledge" as const,
  id: "foods" as const,
  description: "Food and cuisine knowledge",
} as const;
