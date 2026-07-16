import {
  getAnimationPreset,
  getDesignTokens,
  listAnimationPresets,
  tokensToCssVariables,
} from "@/modules/design-system";

import { DEFAULT_COLOR_MODE, THEME_ID } from "./constants";
import type { RenderColorMode, RendererThemeContext } from "./types";

export function buildThemeContext(input?: {
  mode?: RenderColorMode;
  reducedMotion?: boolean;
  highContrast?: boolean;
}): RendererThemeContext {
  const mode = input?.mode ?? DEFAULT_COLOR_MODE;
  const base = getDesignTokens();
  const color =
    mode === "dark"
      ? {
          ...base.color,
          cream: base.color.ink,
          creamMuted: base.color.inkMuted,
          ink: base.color.cream,
          inkMuted: base.color.creamMuted,
          white: base.color.ink,
        }
      : base.color;

  const tokens = { ...base, color };
  const cssVariables = tokensToCssVariables(tokens);

  // Touch animation registry so surfaces can honor reducedMotion
  if (!input?.reducedMotion) {
    void getAnimationPreset("card-enter");
  }

  return {
    mode,
    themeId: THEME_ID,
    tokens: {
      color: { ...color },
      typography: { ...base.typography },
      spacing: { ...base.spacing },
      radius: { ...base.radius },
      shadow: { ...base.shadow },
    },
    animationPresets: listAnimationPresets().map((p) => p.name),
    cssVariables,
    a11y: {
      reducedMotion: Boolean(input?.reducedMotion),
      highContrast: Boolean(input?.highContrast),
    },
  };
}
