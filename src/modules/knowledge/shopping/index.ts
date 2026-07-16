/** Knowledge domain: shopping — DTO contract only (no queries yet). */
export type { ShoppingRecord } from "../types";

export const SUBMODULE = {
  parent: "knowledge" as const,
  id: "shopping" as const,
  description: "Shopping knowledge",
} as const;
