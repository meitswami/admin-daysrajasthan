export type { IconDefinition, IconName } from "../types";
export { getIconDefinition, listIconDefinitions } from "../service";
export { ICON_REGISTRY } from "../constants";

export const SUBMODULE = {
  parent: "design-system" as const,
  id: "icons" as const,
  description: "Brand icon set",
} as const;
