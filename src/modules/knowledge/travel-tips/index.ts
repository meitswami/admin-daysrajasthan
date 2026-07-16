/** Knowledge domain: travel-tips — DTO contract only (no queries yet). */
export type { TravelTipRecord } from "../types";

export const SUBMODULE = {
  parent: "knowledge" as const,
  id: "travel-tips" as const,
  description: "Travel tips",
} as const;
