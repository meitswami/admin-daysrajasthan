import type {
  AnimationPreset,
  CardVariant,
  ColorTokens,
  DesignTokens,
  IconDefinition,
  SpacingTokens,
  SurfaceTheme,
  TypographyTokens,
} from "./types";

export const COLOR_TOKENS: ColorTokens = {
  cream: "#F7F1E8",
  creamMuted: "#EFE6D9",
  maroon: "#7A1F2B",
  maroonDeep: "#5C1520",
  gold: "#C4A35A",
  goldSoft: "#D4BC7D",
  ink: "#1F1612",
  inkMuted: "#5C4F45",
  border: "#E2D5C4",
  success: "#2F6B4F",
  danger: "#9B2C2C",
  white: "#FFFFFF",
};

export const TYPOGRAPHY_TOKENS: TypographyTokens = {
  fontDisplay: '"Cormorant Garamond", "Times New Roman", serif',
  fontSans: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  sizeXs: "0.75rem",
  sizeSm: "0.875rem",
  sizeMd: "1rem",
  sizeLg: "1.125rem",
  sizeXl: "1.5rem",
  size2xl: "2rem",
  sizeHero: "clamp(2.5rem, 5vw, 4rem)",
  weightRegular: 400,
  weightMedium: 500,
  weightSemibold: 600,
  weightBold: 700,
  lineHeightTight: 1.15,
  lineHeightNormal: 1.55,
  letterSpacingWide: "0.12em",
};

export const SPACING_TOKENS: SpacingTokens = {
  xs: "0.25rem",
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
  "2xl": "3rem",
  "3xl": "4.5rem",
};

export const DESIGN_TOKENS: DesignTokens = {
  color: COLOR_TOKENS,
  typography: TYPOGRAPHY_TOKENS,
  spacing: SPACING_TOKENS,
  radius: {
    sm: "0.375rem",
    md: "0.625rem",
    lg: "1rem",
    xl: "1.5rem",
  },
  shadow: {
    soft: "0 1px 2px rgb(31 22 18 / 0.06)",
    card: "0 8px 24px rgb(31 22 18 / 0.08)",
    elevated: "0 16px 40px rgb(31 22 18 / 0.12)",
  },
};

export const SURFACE_THEMES: Record<SurfaceTheme["surface"], SurfaceTheme> = {
  website: {
    surface: "website",
    background: COLOR_TOKENS.cream,
    foreground: COLOR_TOKENS.ink,
    accent: COLOR_TOKENS.maroon,
    accentForeground: COLOR_TOKENS.cream,
    muted: COLOR_TOKENS.creamMuted,
    border: COLOR_TOKENS.border,
    intensity: "full",
  },
  admin: {
    surface: "admin",
    background: COLOR_TOKENS.white,
    foreground: COLOR_TOKENS.ink,
    accent: COLOR_TOKENS.maroon,
    accentForeground: COLOR_TOKENS.white,
    muted: COLOR_TOKENS.creamMuted,
    border: COLOR_TOKENS.border,
    intensity: "quiet",
  },
  customer: {
    surface: "customer",
    background: COLOR_TOKENS.cream,
    foreground: COLOR_TOKENS.ink,
    accent: COLOR_TOKENS.maroon,
    accentForeground: COLOR_TOKENS.cream,
    muted: COLOR_TOKENS.creamMuted,
    border: COLOR_TOKENS.border,
    intensity: "full",
  },
  team: {
    surface: "team",
    background: COLOR_TOKENS.white,
    foreground: COLOR_TOKENS.ink,
    accent: COLOR_TOKENS.maroonDeep,
    accentForeground: COLOR_TOKENS.white,
    muted: COLOR_TOKENS.creamMuted,
    border: COLOR_TOKENS.border,
    intensity: "quiet",
  },
  auth: {
    surface: "auth",
    background: COLOR_TOKENS.cream,
    foreground: COLOR_TOKENS.ink,
    accent: COLOR_TOKENS.maroon,
    accentForeground: COLOR_TOKENS.cream,
    muted: COLOR_TOKENS.creamMuted,
    border: COLOR_TOKENS.border,
    intensity: "full",
  },
};

export const ANIMATION_PRESETS: Record<AnimationPreset["name"], AnimationPreset> = {
  "widget-open": {
    name: "widget-open",
    durationMs: 280,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    cssAnimation: "td-widget-open",
  },
  "card-enter": {
    name: "card-enter",
    durationMs: 320,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    cssAnimation: "td-card-enter",
  },
  "timeline-reveal": {
    name: "timeline-reveal",
    durationMs: 400,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    cssAnimation: "td-timeline-reveal",
  },
};

export const CARD_VARIANTS: Record<CardVariant["name"], CardVariant> = {
  heritage: {
    name: "heritage",
    background: COLOR_TOKENS.maroon,
    border: COLOR_TOKENS.gold,
    shadow: DESIGN_TOKENS.shadow.card,
    titleColor: COLOR_TOKENS.cream,
    bodyColor: COLOR_TOKENS.goldSoft,
  },
  cream: {
    name: "cream",
    background: COLOR_TOKENS.cream,
    border: COLOR_TOKENS.border,
    shadow: DESIGN_TOKENS.shadow.soft,
    titleColor: COLOR_TOKENS.maroon,
    bodyColor: COLOR_TOKENS.inkMuted,
  },
  "gold-edge": {
    name: "gold-edge",
    background: COLOR_TOKENS.white,
    border: COLOR_TOKENS.gold,
    shadow: DESIGN_TOKENS.shadow.card,
    titleColor: COLOR_TOKENS.maroonDeep,
    bodyColor: COLOR_TOKENS.inkMuted,
  },
  quiet: {
    name: "quiet",
    background: COLOR_TOKENS.white,
    border: COLOR_TOKENS.border,
    shadow: DESIGN_TOKENS.shadow.soft,
    titleColor: COLOR_TOKENS.ink,
    bodyColor: COLOR_TOKENS.inkMuted,
  },
};

export const ICON_REGISTRY: Record<IconDefinition["name"], IconDefinition> = {
  fort: { name: "fort", label: "Fort", symbol: "landmark" },
  camel: { name: "camel", label: "Desert", symbol: "sun" },
  "map-pin": { name: "map-pin", label: "Location", symbol: "map-pin" },
  package: { name: "package", label: "Package", symbol: "package" },
  chat: { name: "chat", label: "Chat", symbol: "message-circle" },
  whatsapp: { name: "whatsapp", label: "WhatsApp", symbol: "message-circle" },
  share: { name: "share", label: "Share", symbol: "share-2" },
  download: { name: "download", label: "Download", symbol: "download" },
};

/** CSS custom property names for document root injection */
export const CSS_VARIABLE_PREFIX = "--td" as const;
