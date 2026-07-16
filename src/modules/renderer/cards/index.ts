import type {
  CardModel,
  DestinationCardModel,
  HotelCardModel,
  PackageCardModel,
  PresentationBlock,
} from "../types";

export function asCardModels(blocks: PresentationBlock[]): CardModel[] {
  return blocks
    .filter(
      (b): b is PackageCardModel | DestinationCardModel | HotelCardModel =>
        b.kind === "package_card" ||
        b.kind === "destination_card" ||
        b.kind === "hotel_card"
    )
    .map((b) => ({
      id: b.id,
      kind: "card" as const,
      title: b.title,
      subtitle: b.subtitle,
      themeHints: b.themeHints,
      a11yLabel: b.a11yLabel,
      body: "summary" in b ? (b.summary ?? null) : null,
      imageUrl: "imageUrl" in b ? b.imageUrl : null,
      href: "href" in b ? b.href : null,
      badges: "badges" in b && Array.isArray(b.badges) ? b.badges : [],
    }));
}

export const SUBMODULE = {
  parent: "renderer" as const,
  id: "cards" as const,
  description: "Generic card presentation + hotel/package/destination cards",
} as const;
