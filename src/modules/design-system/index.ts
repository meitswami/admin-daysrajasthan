import { getModuleManifest } from "@/modules/shared";

export const moduleManifest = getModuleManifest("design-system");

export type {
  AnimationPreset,
  AnimationPresetName,
  CardVariant,
  CardVariantName,
  ColorTokens,
  DesignTokens,
  IconDefinition,
  IconName,
  RadiusTokens,
  ShadowTokens,
  SpacingTokens,
  SurfaceId,
  SurfaceTheme,
  TypographyTokens,
} from "./types";

export {
  animationPresetNameSchema,
  cardVariantNameSchema,
  colorTokensSchema,
  iconNameSchema,
  surfaceIdSchema,
} from "./schemas";

export {
  ANIMATION_PRESETS,
  CARD_VARIANTS,
  COLOR_TOKENS,
  CSS_VARIABLE_PREFIX,
  DESIGN_TOKENS,
  ICON_REGISTRY,
  SPACING_TOKENS,
  SURFACE_THEMES,
  TYPOGRAPHY_TOKENS,
} from "./constants";

export {
  parseAnimationPresetName,
  parseCardVariantName,
  parseIconName,
  parseSurfaceId,
} from "./validators";

export {
  getAnimationPreset,
  getCardVariant,
  getColorTokens,
  getDesignTokens,
  getIconDefinition,
  getSurfaceTheme,
  getTypographyTokens,
  listAnimationPresets,
  listCardVariants,
  listIconDefinitions,
  tokensToCssVariables,
} from "./service";

export { SUBMODULE as theme } from "./theme";
export { SUBMODULE as tokens } from "./tokens";
export { SUBMODULE as icons } from "./icons";
export { SUBMODULE as animations } from "./animations";
export { SUBMODULE as cards } from "./cards";
