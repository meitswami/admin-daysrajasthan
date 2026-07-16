export type { DestinationRecord } from "../types";
export { getDestination, getDestinationBySlug, listDestinations } from "../service";

export const SUBMODULE = {
  parent: "knowledge" as const,
  id: "destinations" as const,
  description: "Destination canonical records",
} as const;
