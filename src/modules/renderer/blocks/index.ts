import type {
  ChatMessageModel,
  CtaModel,
  DestinationCardModel,
  HotelCardModel,
  ItineraryModel,
  PackageCardModel,
  PackageComparisonModel,
  PresentationBlock,
  QuotationModel,
  RendererInputBlock,
  TimelineModel,
  WeatherCardModel,
  GalleryModel,
  MapLinkModel,
  TravelTipsModel,
  FaqModel,
  TableModel,
  SectionModel,
} from "../types";
import { QUOTATION_PRICE_DISCLAIMER, WEATHER_UNGROUNDED_NOTE } from "../constants";

let seq = 0;
function id(prefix: string): string {
  seq += 1;
  return `${prefix}_${seq}`;
}

function asItems(payload: Record<string, unknown> | null): Record<string, unknown>[] {
  if (!payload) return [];
  const items = payload.items;
  return Array.isArray(items) ? (items as Record<string, unknown>[]) : [];
}

export function mapChatMessage(block: RendererInputBlock): ChatMessageModel {
  return {
    id: id("chat"),
    kind: "chat_message",
    title: block.title,
    subtitle: null,
    themeHints: { cardVariant: "quiet", animation: "card-enter", tone: "default" },
    a11yLabel: block.title ?? "Assistant message",
    role: "assistant",
    text: block.body ?? "",
    refs: block.refs.map((r) => ({ kind: r.kind, id: r.id, label: r.title })),
  };
}

export function mapPackageCards(block: RendererInputBlock): PackageCardModel[] {
  const fromPayload = asItems(block.payload);
  if (fromPayload.length) {
    return fromPayload.map((item) => ({
      id: id("pkg"),
      kind: "package_card" as const,
      title: String(item.title ?? "Package"),
      subtitle: item.subtitle != null ? String(item.subtitle) : null,
      themeHints: { cardVariant: "heritage", animation: "card-enter" },
      a11yLabel: String(item.title ?? "Package"),
      packageId: String(item.id ?? ""),
      name: String(item.title ?? "Package"),
      summary: item.subtitle != null ? String(item.subtitle) : null,
      href: item.href != null ? String(item.href) : null,
      imageUrl: null,
      badges: [],
    }));
  }
  return block.refs
    .filter((r) => r.kind === "package")
    .map((r) => ({
      id: id("pkg"),
      kind: "package_card" as const,
      title: r.title,
      subtitle: null,
      themeHints: { cardVariant: "heritage", animation: "card-enter" },
      a11yLabel: r.title,
      packageId: r.id,
      name: r.title,
      summary: null,
      href: null,
      imageUrl: null,
      badges: [],
    }));
}

export function mapDestinationCards(block: RendererInputBlock): DestinationCardModel[] {
  const fromPayload = asItems(block.payload);
  if (fromPayload.length) {
    return fromPayload.map((item) => ({
      id: id("dest"),
      kind: "destination_card" as const,
      title: String(item.title ?? "Destination"),
      subtitle: item.subtitle != null ? String(item.subtitle) : null,
      themeHints: { cardVariant: "cream", animation: "card-enter" },
      a11yLabel: String(item.title ?? "Destination"),
      destinationId: String(item.id ?? ""),
      name: String(item.title ?? "Destination"),
      summary: item.subtitle != null ? String(item.subtitle) : null,
      href: item.href != null ? String(item.href) : null,
      imageUrl: null,
    }));
  }
  return block.refs
    .filter((r) => r.kind === "destination")
    .map((r) => ({
      id: id("dest"),
      kind: "destination_card" as const,
      title: r.title,
      subtitle: null,
      themeHints: { cardVariant: "cream", animation: "card-enter" },
      a11yLabel: r.title,
      destinationId: r.id,
      name: r.title,
      summary: null,
      href: null,
      imageUrl: null,
    }));
}

export function mapTimeline(block: RendererInputBlock): TimelineModel {
  const stepsPayload = block.payload?.steps;
  const steps = Array.isArray(stepsPayload)
    ? (stepsPayload as Record<string, unknown>[]).map((s, i) => ({
        order: Number(s.order ?? i + 1),
        title: String(s.title ?? `Step ${i + 1}`),
        description: null,
        refId: s.refId != null ? String(s.refId) : null,
        refKind: s.refKind != null ? String(s.refKind) : null,
      }))
    : block.refs.map((r, i) => ({
        order: i + 1,
        title: r.title,
        description: null,
        refId: r.id,
        refKind: r.kind,
      }));

  return {
    id: id("timeline"),
    kind: "timeline",
    title: block.title ?? "Trip timeline",
    subtitle: block.body,
    themeHints: { animation: "timeline-reveal" },
    a11yLabel: block.title ?? "Trip timeline",
    steps,
  };
}

export function mapItinerary(block: RendererInputBlock): ItineraryModel {
  const stepsPayload = block.payload?.steps;
  const days = Array.isArray(stepsPayload)
    ? (stepsPayload as Record<string, unknown>[]).map((s, i) => ({
        day: Number(s.order ?? i + 1),
        title: String(s.title ?? `Day ${i + 1}`),
        body: null as string | null,
        refIds: s.refId != null ? [String(s.refId)] : [],
      }))
    : block.refs.map((r, i) => ({
        day: i + 1,
        title: r.title,
        body: null as string | null,
        refIds: [r.id],
      }));

  const ctas: CtaModel[] = [
    {
      id: id("cta"),
      kind: "cta",
      title: null,
      subtitle: null,
      themeHints: { tone: "accent" },
      a11yLabel: "Download PDF",
      label: "Download PDF",
      href: null,
      action: "download_pdf",
      disabled: false,
    },
    {
      id: id("cta"),
      kind: "cta",
      title: null,
      subtitle: null,
      themeHints: { tone: "default" },
      a11yLabel: "Share link",
      label: "Share",
      href: null,
      action: "share",
      disabled: false,
    },
  ];

  return {
    id: id("itin"),
    kind: "itinerary",
    title: block.title ?? "Itinerary",
    subtitle: block.body,
    themeHints: { cardVariant: "heritage", animation: "timeline-reveal" },
    a11yLabel: block.title ?? "Itinerary",
    days,
    ctas,
  };
}

export function mapComparison(block: RendererInputBlock): PackageComparisonModel | TableModel {
  const columns = Array.isArray(block.payload?.columns)
    ? (block.payload!.columns as string[])
    : ["id", "title", "subtitle", "score"];
  const rows = Array.isArray(block.payload?.rows)
    ? (block.payload!.rows as Record<string, string | number | null>[])
    : block.refs.map((r) => ({ id: r.id, title: r.title, subtitle: null, score: null }));

  return {
    id: id("compare"),
    kind: "package_comparison",
    title: block.title ?? "Package comparison",
    subtitle: null,
    themeHints: { cardVariant: "gold-edge" },
    a11yLabel: block.title ?? "Package comparison",
    columns,
    rows,
  };
}

export function mapQuotation(block: RendererInputBlock): QuotationModel {
  const lines = block.refs.map((r) => ({ label: r.title, value: r.id }));
  return {
    id: id("quote"),
    kind: "quotation",
    title: block.title ?? "Quotation",
    subtitle: block.body,
    themeHints: { cardVariant: "gold-edge", tone: "accent" },
    a11yLabel: block.title ?? "Quotation",
    quotationId: block.refs.find((r) => r.kind === "quotation")?.id ?? null,
    lines,
    disclaimer: QUOTATION_PRICE_DISCLAIMER,
    ctas: [
      {
        id: id("cta"),
        kind: "cta",
        title: null,
        subtitle: null,
        themeHints: { tone: "accent" },
        a11yLabel: "Book",
        label: "Booking CTA",
        href: null,
        action: "book",
        disabled: true,
      },
    ],
  };
}

export function mapHotelCards(block: RendererInputBlock): HotelCardModel[] {
  return block.refs
    .filter((r) => r.kind === "hotel" || r.kind === "knowledge")
    .map((r) => ({
      id: id("hotel"),
      kind: "hotel_card" as const,
      title: r.title,
      subtitle: null,
      themeHints: { cardVariant: "cream" },
      a11yLabel: r.title,
      name: r.title,
      category: null,
      href: null,
      imageUrl: null,
    }));
}

export function mapWeather(block: RendererInputBlock): WeatherCardModel {
  return {
    id: id("weather"),
    kind: "weather_card",
    title: block.title ?? "Weather",
    subtitle: null,
    themeHints: { tone: "muted" },
    a11yLabel: "Weather",
    summary: typeof block.payload?.summary === "string" ? block.payload.summary : null,
    note: WEATHER_UNGROUNDED_NOTE,
  };
}

export function mapGallery(block: RendererInputBlock): GalleryModel {
  const items = asItems(block.payload).map((item, i) => ({
    id: String(item.id ?? `g${i}`),
    src: String(item.src ?? item.url ?? ""),
    alt: String(item.alt ?? item.title ?? "Gallery image"),
    caption: item.caption != null ? String(item.caption) : null,
  }));
  return {
    id: id("gallery"),
    kind: "gallery",
    title: block.title ?? "Gallery",
    subtitle: block.body,
    themeHints: { animation: "card-enter" },
    a11yLabel: block.title ?? "Gallery",
    items,
    layout: "grid",
  };
}

export function mapMapLinks(block: RendererInputBlock): MapLinkModel {
  const links = Array.isArray(block.payload?.links)
    ? (block.payload!.links as { label: string; href: string }[])
    : block.refs.map((r) => ({
        label: r.title,
        href: `https://maps.google.com/?q=${encodeURIComponent(r.title)}`,
      }));
  return {
    id: id("maps"),
    kind: "map_links",
    title: block.title ?? "Map links",
    subtitle: null,
    themeHints: {},
    a11yLabel: "Map links",
    links,
  };
}

export function mapTravelTips(block: RendererInputBlock): TravelTipsModel {
  const tips = Array.isArray(block.payload?.tips)
    ? (block.payload!.tips as string[])
    : block.body
      ? [block.body]
      : [];
  return {
    id: id("tips"),
    kind: "travel_tips",
    title: block.title ?? "Travel tips",
    subtitle: null,
    themeHints: { tone: "muted" },
    a11yLabel: "Travel tips",
    tips,
  };
}

export function mapFaq(block: RendererInputBlock): FaqModel {
  const items = Array.isArray(block.payload?.items)
    ? (block.payload!.items as { question: string; answer: string }[])
    : [];
  return {
    id: id("faq"),
    kind: "faq",
    title: block.title ?? "FAQs",
    subtitle: null,
    themeHints: {},
    a11yLabel: "FAQs",
    items,
  };
}

export function mapSection(block: RendererInputBlock, children: PresentationBlock[] = []): SectionModel {
  return {
    id: id("section"),
    kind: "section",
    title: block.title,
    subtitle: null,
    themeHints: {},
    a11yLabel: block.title,
    body: block.body,
    children,
  };
}

/**
 * Map a single input DTO block → zero or more presentation models.
 */
export function mapInputBlock(block: RendererInputBlock): PresentationBlock[] {
  switch (block.kind) {
    case "message":
    case "summary":
    case "suggestion":
    case "fallback_browse":
      return [mapChatMessage(block)];
    case "package_list":
      return mapPackageCards(block);
    case "destination_list":
      return mapDestinationCards(block);
    case "itinerary_outline":
      return [mapTimeline(block), mapItinerary(block)];
    case "comparison":
      return [mapComparison(block)];
    case "quotation_hint":
      return [mapQuotation(block)];
    case "crm_hint":
      return [mapChatMessage(block)];
    case "gallery":
      return [mapGallery(block)];
    case "weather":
      return [mapWeather(block)];
    case "map":
      return [mapMapLinks(block)];
    case "tips":
      return [mapTravelTips(block)];
    case "faq":
      return [mapFaq(block)];
    case "hotel_list":
      return mapHotelCards(block);
    default:
      if (block.body || block.title) return [mapChatMessage(block)];
      if (block.refs.length) {
        return [
          mapSection(block, [
            ...mapPackageCards({ ...block, kind: "package_list" }),
            ...mapDestinationCards({ ...block, kind: "destination_list" }),
          ]),
        ];
      }
      return [];
  }
}

export function mapDocumentBlocks(blocks: RendererInputBlock[]): PresentationBlock[] {
  seq = 0;
  return blocks.flatMap(mapInputBlock);
}

export const SUBMODULE = {
  parent: "renderer" as const,
  id: "blocks" as const,
  description: "DTO → presentation block mapping",
} as const;
