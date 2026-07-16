import {
  ANIMATION_PRESETS,
  CARD_VARIANTS,
  COLOR_TOKENS,
  CSS_VARIABLE_PREFIX,
  DESIGN_TOKENS,
  ICON_REGISTRY,
  SURFACE_THEMES,
  TYPOGRAPHY_TOKENS,
} from "./constants";
import type {
  AnimationPreset,
  AnimationPresetName,
  CardVariant,
  CardVariantName,
  ColorTokens,
  DesignTokens,
  IconDefinition,
  IconName,
  SurfaceId,
  SurfaceTheme,
  TypographyTokens,
} from "./types";
import {
  parseAnimationPresetName,
  parseCardVariantName,
  parseIconName,
  parseSurfaceId,
} from "./validators";

export function getDesignTokens(): DesignTokens {
  return DESIGN_TOKENS;
}

export function getColorTokens(): ColorTokens {
  return COLOR_TOKENS;
}

export function getTypographyTokens(): TypographyTokens {
  return TYPOGRAPHY_TOKENS;
}

export function getSurfaceTheme(surface: SurfaceId | string): SurfaceTheme {
  const id = parseSurfaceId(surface);
  return SURFACE_THEMES[id];
}

export function getAnimationPreset(
  name: AnimationPresetName | string
): AnimationPreset {
  const key = parseAnimationPresetName(name);
  return ANIMATION_PRESETS[key];
}

export function getCardVariant(name: CardVariantName | string): CardVariant {
  const key = parseCardVariantName(name);
  return CARD_VARIANTS[key];
}

export function getIconDefinition(name: IconName | string): IconDefinition {
  const key = parseIconName(name);
  return ICON_REGISTRY[key];
}

export function listIconDefinitions(): IconDefinition[] {
  return Object.values(ICON_REGISTRY);
}

export function listAnimationPresets(): AnimationPreset[] {
  return Object.values(ANIMATION_PRESETS);
}

export function listCardVariants(): CardVariant[] {
  return Object.values(CARD_VARIANTS);
}

/**
 * Flatten design tokens into CSS custom properties for a document/root element.
 * Presentational layers apply the map; this function stays framework-agnostic.
 */
export function tokensToCssVariables(
  tokens: DesignTokens = DESIGN_TOKENS
): Record<string, string> {
  const p = CSS_VARIABLE_PREFIX;
  return {
    [`${p}-color-cream`]: tokens.color.cream,
    [`${p}-color-cream-muted`]: tokens.color.creamMuted,
    [`${p}-color-maroon`]: tokens.color.maroon,
    [`${p}-color-maroon-deep`]: tokens.color.maroonDeep,
    [`${p}-color-gold`]: tokens.color.gold,
    [`${p}-color-gold-soft`]: tokens.color.goldSoft,
    [`${p}-color-ink`]: tokens.color.ink,
    [`${p}-color-ink-muted`]: tokens.color.inkMuted,
    [`${p}-color-border`]: tokens.color.border,
    [`${p}-color-success`]: tokens.color.success,
    [`${p}-color-danger`]: tokens.color.danger,
    [`${p}-color-white`]: tokens.color.white,
    [`${p}-font-display`]: tokens.typography.fontDisplay,
    [`${p}-font-sans`]: tokens.typography.fontSans,
    [`${p}-radius-md`]: tokens.radius.md,
    [`${p}-shadow-card`]: tokens.shadow.card,
  };
}
