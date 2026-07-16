import { getModuleManifest } from "@/modules/shared";

export const moduleManifest = getModuleManifest("renderer");

export type {
  CardModel,
  ChatMessageModel,
  CtaModel,
  DestinationCardModel,
  EmailRenderOutput,
  FaqModel,
  GalleryModel,
  HeroModel,
  HotelCardModel,
  ItineraryModel,
  JsonRenderOutput,
  MapLinkModel,
  MetadataModel,
  NativeMobileRenderOutput,
  PackageCardModel,
  PackageComparisonModel,
  PdfRenderOutput,
  PresentationBlock,
  PresentationBlockKind,
  QuotationModel,
  ReactPresentationNode,
  ReactRenderOutput,
  RenderColorMode,
  RenderOptions,
  RenderOutput,
  RenderOutputType,
  RenderSurface,
  RendererInputBlock,
  RendererInputDocument,
  RendererThemeContext,
  SectionModel,
  SeoModel,
  TableModel,
  TimelineModel,
  TravelTipsModel,
  WeatherCardModel,
  WhatsAppRenderOutput,
} from "./types";

export {
  DEFAULT_COLOR_MODE,
  DEFAULT_OUTPUT_TYPE,
  DEFAULT_SURFACE,
  FUTURE_COMPONENTS,
  OUTPUT_TYPE_LABELS,
  QUOTATION_PRICE_DISCLAIMER,
  RENDERER_MODULE_ID,
  THEME_ID,
  WEATHER_UNGROUNDED_NOTE,
} from "./constants";

export {
  renderColorModeSchema,
  renderOptionsSchema,
  renderOutputTypeSchema,
  renderSurfaceSchema,
  rendererInputBlockSchema,
  rendererInputDocumentSchema,
} from "./schemas";

export { parseRenderOptions, parseRendererInput } from "./validators";

export { buildThemeContext } from "./theme";

export { mapToPresentation, renderDocument, renderIntelligenceDto } from "./service";

export { SUBMODULE as blocks } from "./blocks";
export { mapDocumentBlocks, mapInputBlock } from "./blocks";

export { SUBMODULE as chat } from "./chat";
export { renderChatBlocks } from "./chat";

export { SUBMODULE as timeline } from "./timeline";
export { renderTimeline } from "./timeline";

export { SUBMODULE as packageView } from "./package";
export { renderPackageCards } from "./package";

export { SUBMODULE as destination } from "./destination";
export { renderDestinationCards } from "./destination";

export { SUBMODULE as quotation } from "./quotation";
export { renderQuotation } from "./quotation";

export { SUBMODULE as itinerary } from "./itinerary";
export { renderItinerary } from "./itinerary";

export { SUBMODULE as cards } from "./cards";
export { asCardModels } from "./cards";

export { SUBMODULE as tables } from "./tables";
export { renderComparisonTable, toMatrix } from "./tables";

export { SUBMODULE as gallery } from "./gallery";
export { renderGallery } from "./gallery";

export { SUBMODULE as maps } from "./maps";
export { renderMapLinks } from "./maps";

export { SUBMODULE as pdf } from "./pdf";
export { toPdfOutput } from "./pdf";

export { SUBMODULE as email } from "./email";
export { toEmailOutput } from "./email";

export { SUBMODULE as whatsapp } from "./whatsapp";
export { toWhatsAppOutput } from "./whatsapp";

export { SUBMODULE as seo } from "./seo";
export { buildSeoModel, extractSeo } from "./seo";

export { SUBMODULE as metadata } from "./metadata";
export { buildMetadataModel, extractMetadata } from "./metadata";

export { toReactOutput } from "./react-adapter";
