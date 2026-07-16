import { mapMapLinks } from "../blocks";
import type { MapLinkModel, RendererInputBlock } from "../types";

export function renderMapLinks(block: RendererInputBlock): MapLinkModel {
  return mapMapLinks(block);
}

export const SUBMODULE = {
  parent: "renderer" as const,
  id: "maps" as const,
  description: "Map link presentation (from DTO only)",
} as const;
