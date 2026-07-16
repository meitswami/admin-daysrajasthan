export type { CardVariant, CardVariantName } from "../types";
export { getCardVariant, listCardVariants } from "../service";
export { CARD_VARIANTS } from "../constants";

export const SUBMODULE = {
  parent: "design-system" as const,
  id: "cards" as const,
  description: "Branded card primitives for chat and marketing",
} as const;
