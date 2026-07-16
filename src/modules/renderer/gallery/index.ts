import { mapGallery } from "../blocks";
import type { GalleryModel, RendererInputBlock } from "../types";

export function renderGallery(block: RendererInputBlock): GalleryModel {
  return mapGallery(block);
}

export const SUBMODULE = {
  parent: "renderer" as const,
  id: "gallery" as const,
  description: "Gallery grid (carousel reserved for future)",
} as const;
