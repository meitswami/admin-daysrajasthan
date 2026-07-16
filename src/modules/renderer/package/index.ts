import { mapPackageCards } from "../blocks";
import type { PackageCardModel, RendererInputBlock } from "../types";

export function renderPackageCards(block: RendererInputBlock): PackageCardModel[] {
  return mapPackageCards(block);
}

export const SUBMODULE = {
  parent: "renderer" as const,
  id: "package" as const,
  description: "Package card presentation",
} as const;
