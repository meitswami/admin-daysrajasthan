/** Knowledge domain: places — DTO contract only (no queries yet). */
export type { PlaceRecord } from "../types";

export const SUBMODULE = {
  parent: "knowledge" as const,
  id: "places" as const,
  description: "Places and points of interest",
} as const;
