import type { PresentationBlock, SeoModel } from "../types";

export function buildSeoModel(input: {
  pageTitle?: string | null;
  description?: string | null;
  canonicalUrl?: string | null;
  ogImage?: string | null;
}): SeoModel {
  return {
    id: "seo_primary",
    kind: "seo",
    title: "SEO",
    subtitle: null,
    themeHints: {},
    a11yLabel: null,
    pageTitle: input.pageTitle ?? "Travel Days",
    description: input.description ?? "Royal Rajasthan journeys with Travel Days.",
    canonicalUrl: input.canonicalUrl ?? null,
    ogImage: input.ogImage ?? null,
    robots: "index,follow",
  };
}

export function extractSeo(blocks: PresentationBlock[]): SeoModel | null {
  return blocks.find((b): b is SeoModel => b.kind === "seo") ?? null;
}

export const SUBMODULE = {
  parent: "renderer" as const,
  id: "seo" as const,
  description: "SEO metadata presentation",
} as const;
