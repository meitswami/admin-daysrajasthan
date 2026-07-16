/** Design-system public types — Royal Rajasthan brand. */

export type SurfaceId = "website" | "admin" | "customer" | "team" | "auth";

export type ColorTokens = {
  cream: string;
  creamMuted: string;
  maroon: string;
  maroonDeep: string;
  gold: string;
  goldSoft: string;
  ink: string;
  inkMuted: string;
  border: string;
  success: string;
  danger: string;
  white: string;
};

export type TypographyTokens = {
  fontDisplay: string;
  fontSans: string;
  sizeXs: string;
  sizeSm: string;
  sizeMd: string;
  sizeLg: string;
  sizeXl: string;
  size2xl: string;
  sizeHero: string;
  weightRegular: number;
  weightMedium: number;
  weightSemibold: number;
  weightBold: number;
  lineHeightTight: number;
  lineHeightNormal: number;
  letterSpacingWide: string;
};

export type SpacingTokens = {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  "2xl": string;
  "3xl": string;
};

export type RadiusTokens = {
  sm: string;
  md: string;
  lg: string;
  xl: string;
};

export type ShadowTokens = {
  soft: string;
  card: string;
  elevated: string;
};

export type DesignTokens = {
  color: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  shadow: ShadowTokens;
};

export type SurfaceTheme = {
  surface: SurfaceId;
  background: string;
  foreground: string;
  accent: string;
  accentForeground: string;
  muted: string;
  border: string;
  /** Full brand intensity for marketing vs quieter ops panels */
  intensity: "full" | "quiet";
};

export type AnimationPresetName =
  | "widget-open"
  | "card-enter"
  | "timeline-reveal";

export type AnimationPreset = {
  name: AnimationPresetName;
  durationMs: number;
  easing: string;
  cssAnimation: string;
};

export type CardVariantName = "heritage" | "cream" | "gold-edge" | "quiet";

export type CardVariant = {
  name: CardVariantName;
  background: string;
  border: string;
  shadow: string;
  titleColor: string;
  bodyColor: string;
};

export type IconName =
  | "fort"
  | "camel"
  | "map-pin"
  | "package"
  | "chat"
  | "whatsapp"
  | "share"
  | "download";

export type IconDefinition = {
  name: IconName;
  label: string;
  /** Lucide-compatible key or SVG symbol id for presentational wrappers */
  symbol: string;
};
