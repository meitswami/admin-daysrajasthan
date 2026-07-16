/**
 * Universal Renderer — presentation models only.
 * Consumes DTOs; never Query / Search / Supabase / Providers.
 */

export type RenderOutputType =
  | "react"
  | "pdf"
  | "email"
  | "whatsapp"
  | "json"
  | "native_mobile_future";

export type RenderColorMode = "light" | "dark";

export type RenderSurface =
  | "website"
  | "admin"
  | "customer_portal"
  | "team_portal"
  | "chat"
  | "email"
  | "pdf"
  | "whatsapp"
  | "mobile";

/** Opaque grounded DTO block — structural match for Intelligence (and others). */
export type RendererInputBlock = {
  kind: string;
  title: string | null;
  body: string | null;
  refs: { kind: string; id: string; title: string }[];
  payload: Record<string, unknown> | null;
};

export type RendererInputDocument = {
  blocks: RendererInputBlock[];
  traceId?: string | null;
  locale?: string | null;
  extras?: Record<string, unknown>;
};

export type RendererThemeContext = {
  mode: RenderColorMode;
  themeId: "royal-rajasthan";
  tokens: {
    color: Record<string, string>;
    typography: Record<string, string | number>;
    spacing: Record<string, string>;
    radius: Record<string, string>;
    shadow: Record<string, string>;
  };
  animationPresets: string[];
  cssVariables: Record<string, string>;
  a11y: {
    reducedMotion: boolean;
    highContrast: boolean;
  };
};

export type PresentationBlockKind =
  | "chat_message"
  | "timeline"
  | "hero"
  | "card"
  | "section"
  | "cta"
  | "gallery"
  | "faq"
  | "package_comparison"
  | "weather_card"
  | "travel_tips"
  | "map_links"
  | "hotel_card"
  | "package_card"
  | "destination_card"
  | "quotation"
  | "itinerary"
  | "table"
  | "metadata"
  | "seo";

export type PresentationBase = {
  id: string;
  kind: PresentationBlockKind;
  title: string | null;
  subtitle: string | null;
  themeHints: {
    cardVariant?: string;
    animation?: string;
    tone?: "default" | "accent" | "muted" | "danger" | "success";
  };
  a11yLabel: string | null;
};

export type ChatMessageModel = PresentationBase & {
  kind: "chat_message";
  role: "assistant" | "user" | "system";
  text: string;
  refs: { kind: string; id: string; label: string }[];
};

export type TimelineStepModel = {
  order: number;
  title: string;
  description: string | null;
  refId: string | null;
  refKind: string | null;
};

export type TimelineModel = PresentationBase & {
  kind: "timeline";
  steps: TimelineStepModel[];
};

export type HeroModel = PresentationBase & {
  kind: "hero";
  headline: string;
  support: string | null;
  imageUrl: string | null;
  ctas: CtaModel[];
};

export type CardModel = PresentationBase & {
  kind: "card";
  body: string | null;
  imageUrl: string | null;
  href: string | null;
  badges: string[];
};

export type SectionModel = PresentationBase & {
  kind: "section";
  body: string | null;
  children: PresentationBlock[];
};

export type CtaModel = PresentationBase & {
  kind: "cta";
  label: string;
  href: string | null;
  action: "link" | "share" | "download_pdf" | "book" | "copy" | "custom";
  disabled: boolean;
};

export type GalleryItemModel = {
  id: string;
  src: string;
  alt: string;
  caption: string | null;
};

export type GalleryModel = PresentationBase & {
  kind: "gallery";
  items: GalleryItemModel[];
  layout: "grid" | "carousel_future";
};

export type FaqItemModel = { question: string; answer: string };

export type FaqModel = PresentationBase & {
  kind: "faq";
  items: FaqItemModel[];
};

export type PackageComparisonModel = PresentationBase & {
  kind: "package_comparison";
  columns: string[];
  rows: Record<string, string | number | null>[];
};

export type WeatherCardModel = PresentationBase & {
  kind: "weather_card";
  /** Renderer never invents weather — only presents provided DTO fields. */
  summary: string | null;
  note: string;
};

export type TravelTipsModel = PresentationBase & {
  kind: "travel_tips";
  tips: string[];
};

export type MapLinkModel = PresentationBase & {
  kind: "map_links";
  links: { label: string; href: string }[];
};

export type HotelCardModel = PresentationBase & {
  kind: "hotel_card";
  name: string;
  category: string | null;
  href: string | null;
  imageUrl: string | null;
};

export type PackageCardModel = PresentationBase & {
  kind: "package_card";
  packageId: string;
  name: string;
  summary: string | null;
  href: string | null;
  imageUrl: string | null;
  badges: string[];
};

export type DestinationCardModel = PresentationBase & {
  kind: "destination_card";
  destinationId: string;
  name: string;
  summary: string | null;
  href: string | null;
  imageUrl: string | null;
};

export type QuotationModel = PresentationBase & {
  kind: "quotation";
  quotationId: string | null;
  lines: { label: string; value: string }[];
  disclaimer: string;
  ctas: CtaModel[];
};

export type ItineraryModel = PresentationBase & {
  kind: "itinerary";
  days: { day: number; title: string; body: string | null; refIds: string[] }[];
  ctas: CtaModel[];
};

export type TableModel = PresentationBase & {
  kind: "table";
  columns: string[];
  rows: (string | number | null)[][];
};

export type MetadataModel = PresentationBase & {
  kind: "metadata";
  fields: Record<string, string | number | boolean | null>;
};

export type SeoModel = PresentationBase & {
  kind: "seo";
  pageTitle: string;
  description: string;
  canonicalUrl: string | null;
  ogImage: string | null;
  robots: string;
};

export type PresentationBlock =
  | ChatMessageModel
  | TimelineModel
  | HeroModel
  | CardModel
  | SectionModel
  | CtaModel
  | GalleryModel
  | FaqModel
  | PackageComparisonModel
  | WeatherCardModel
  | TravelTipsModel
  | MapLinkModel
  | HotelCardModel
  | PackageCardModel
  | DestinationCardModel
  | QuotationModel
  | ItineraryModel
  | TableModel
  | MetadataModel
  | SeoModel;

export type ReactPresentationNode = {
  type: string;
  props: Record<string, unknown>;
  children?: ReactPresentationNode[];
};

export type ReactRenderOutput = {
  outputType: "react";
  theme: RendererThemeContext;
  tree: ReactPresentationNode[];
  blocks: PresentationBlock[];
};

export type PdfRenderOutput = {
  outputType: "pdf";
  theme: RendererThemeContext;
  title: string;
  sections: { heading: string | null; body: string; pageBreakAfter?: boolean }[];
  blocks: PresentationBlock[];
};

export type EmailRenderOutput = {
  outputType: "email";
  theme: RendererThemeContext;
  subject: string;
  preheader: string;
  htmlSkeleton: string;
  textPlain: string;
  blocks: PresentationBlock[];
};

export type WhatsAppRenderOutput = {
  outputType: "whatsapp";
  theme: RendererThemeContext;
  messages: string[];
  blocks: PresentationBlock[];
};

export type JsonRenderOutput = {
  outputType: "json";
  theme: RendererThemeContext;
  blocks: PresentationBlock[];
};

export type NativeMobileRenderOutput = {
  outputType: "native_mobile_future";
  theme: RendererThemeContext;
  screens: { id: string; blocks: PresentationBlock[] }[];
  blocks: PresentationBlock[];
};

export type RenderOutput =
  | ReactRenderOutput
  | PdfRenderOutput
  | EmailRenderOutput
  | WhatsAppRenderOutput
  | JsonRenderOutput
  | NativeMobileRenderOutput;

export type RenderOptions = {
  outputType: RenderOutputType;
  surface?: RenderSurface;
  mode?: RenderColorMode;
  reducedMotion?: boolean;
  highContrast?: boolean;
  locale?: string | null;
  pageTitle?: string | null;
};
