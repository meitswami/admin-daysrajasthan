export type { ColorTokens, DesignTokens, TypographyTokens } from "../types";
export {
  getColorTokens,
  getDesignTokens,
  getTypographyTokens,
  tokensToCssVariables,
} from "../service";
export { COLOR_TOKENS, DESIGN_TOKENS, TYPOGRAPHY_TOKENS } from "../constants";

export const SUBMODULE = {
  parent: "design-system" as const,
  id: "tokens" as const,
  description: "Color, typography, spacing tokens",
} as const;
