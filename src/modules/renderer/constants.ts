import type { RenderColorMode, RenderOutputType, RenderSurface } from "./types";

export const RENDERER_MODULE_ID = "renderer" as const;

export const THEME_ID = "royal-rajasthan" as const;

export const DEFAULT_OUTPUT_TYPE: RenderOutputType = "json";
export const DEFAULT_COLOR_MODE: RenderColorMode = "light";
export const DEFAULT_SURFACE: RenderSurface = "website";

export const QUOTATION_PRICE_DISCLAIMER =
  "Prices are shown only when provided by Quotation Engine — Renderer never invents amounts.";

export const WEATHER_UNGROUNDED_NOTE =
  "Weather is displayed only from provided DTO fields — never invented by Renderer.";

export const FUTURE_COMPONENTS = [
  "Trip Timeline",
  "Pricing Table",
  "Comparison Table",
  "Booking CTA",
  "Download PDF",
  "Share Link",
  "Gallery Carousel",
] as const;

export const OUTPUT_TYPE_LABELS: Record<RenderOutputType, string> = {
  react: "React presentation tree",
  pdf: "PDF document model",
  email: "Email HTML/text model",
  whatsapp: "WhatsApp message lines",
  json: "Structured JSON presentation",
  native_mobile_future: "Native mobile screen model (future)",
};
