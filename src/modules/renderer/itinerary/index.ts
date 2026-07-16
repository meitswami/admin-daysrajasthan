import { mapItinerary } from "../blocks";
import type { ItineraryModel, RendererInputBlock } from "../types";

export function renderItinerary(block: RendererInputBlock): ItineraryModel {
  return mapItinerary(block);
}

export const SUBMODULE = {
  parent: "renderer" as const,
  id: "itinerary" as const,
  description: "Itinerary presentation with share / PDF CTAs",
} as const;
