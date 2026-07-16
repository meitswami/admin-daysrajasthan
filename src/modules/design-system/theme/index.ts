export type { SurfaceId, SurfaceTheme } from "../types";
export { getSurfaceTheme } from "../service";
export { SURFACE_THEMES } from "../constants";

export const SUBMODULE = {
  parent: "design-system" as const,
  id: "theme" as const,
  description: "Theme provider and surface themes",
} as const;
