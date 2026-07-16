export type { AnimationPreset, AnimationPresetName } from "../types";
export { getAnimationPreset, listAnimationPresets } from "../service";
export { ANIMATION_PRESETS } from "../constants";

export const SUBMODULE = {
  parent: "design-system" as const,
  id: "animations" as const,
  description: "Motion presets",
} as const;
