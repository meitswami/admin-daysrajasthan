import { mapDestinationCards } from "../blocks";
import type { DestinationCardModel, RendererInputBlock } from "../types";

export function renderDestinationCards(block: RendererInputBlock): DestinationCardModel[] {
  return mapDestinationCards(block);
}

export const SUBMODULE = {
  parent: "renderer" as const,
  id: "destination" as const,
  description: "Destination card presentation",
} as const;
