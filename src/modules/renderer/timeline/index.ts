import { mapTimeline } from "../blocks";
import type { RendererInputBlock, TimelineModel } from "../types";

export function renderTimeline(block: RendererInputBlock): TimelineModel {
  return mapTimeline(block);
}

export const SUBMODULE = {
  parent: "renderer" as const,
  id: "timeline" as const,
  description: "Trip timeline presentation",
} as const;
