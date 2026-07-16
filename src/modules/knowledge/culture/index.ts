/** Knowledge domain: culture — DTO contract only (no queries yet). */
export type { CultureRecord } from "../types";

export const SUBMODULE = {
  parent: "knowledge" as const,
  id: "culture" as const,
  description: "Culture knowledge",
} as const;
