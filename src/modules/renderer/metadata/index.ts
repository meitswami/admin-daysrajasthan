import type { MetadataModel, PresentationBlock } from "../types";

export function buildMetadataModel(fields: Record<string, string | number | boolean | null>): MetadataModel {
  return {
    id: "meta_primary",
    kind: "metadata",
    title: "Metadata",
    subtitle: null,
    themeHints: {},
    a11yLabel: null,
    fields,
  };
}

export function extractMetadata(blocks: PresentationBlock[]): MetadataModel | null {
  return blocks.find((b): b is MetadataModel => b.kind === "metadata") ?? null;
}

export const SUBMODULE = {
  parent: "renderer" as const,
  id: "metadata" as const,
  description: "Generic metadata presentation",
} as const;
