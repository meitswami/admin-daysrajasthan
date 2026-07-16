import { getModuleManifest } from "@/modules/shared";

export const moduleManifest = getModuleManifest("knowledge");

export type {
  ActivityRecord,
  BlogRecord,
  CultureRecord,
  DestinationRecord,
  FaqRecord,
  FoodRecord,
  HotelRecord,
  KnowledgeCacheKey,
  KnowledgeContextPacket,
  KnowledgeDomain,
  KnowledgeId,
  KnowledgeListFilters,
  KnowledgeSlug,
  KnowledgeVisibility,
  PackageRecord,
  PlaceRecord,
  RegionCode,
  ShoppingRecord,
  TravelTipRecord,
  WeatherRecord,
} from "./types";

export { KNOWLEDGE_CACHE_PREFIX, KNOWLEDGE_DEFAULT_LIST_LIMIT, KNOWLEDGE_DOMAIN_TABLES } from "./constants";

export {
  knowledgeIdSchema,
  knowledgeListFiltersSchema,
  knowledgeSlugSchema,
  packageStatusSchema,
  regionCodeSchema,
} from "./schemas";

export { parseKnowledgeId, parseKnowledgeSlug, parseListFilters } from "./validators";

export {
  getKnowledgeCache,
  PassthroughKnowledgeCache,
  setKnowledgeCache,
  withKnowledgeCache,
  type KnowledgeCache,
} from "./cache";

export {
  buildContextPacket,
  getBlogBySlug,
  getDestination,
  getDestinationBySlug,
  getHotel,
  getPackage,
  getPackageBySlug,
  listActivities,
  listBlogs,
  listCulture,
  listDestinations,
  listFaqs,
  listFoods,
  listHotels,
  listPackages,
  listPlaces,
  listShopping,
  listTravelTips,
  listWeather,
} from "./service";

/** CMS helper — maps PackageRecord → legacy Itinerary view model (admin UI). */
export { mapPackageToItineraryView } from "./mappers";

export { SUBMODULE as destinations } from "./destinations";
export { SUBMODULE as packages } from "./packages";
export { SUBMODULE as places } from "./places";
export { SUBMODULE as activities } from "./activities";
export { SUBMODULE as foods } from "./foods";
export { SUBMODULE as hotels } from "./hotels";
export { SUBMODULE as weather } from "./weather";
export { SUBMODULE as culture } from "./culture";
export { SUBMODULE as shopping } from "./shopping";
export { SUBMODULE as travelTips } from "./travel-tips";
export { SUBMODULE as faq } from "./faq";
export { SUBMODULE as blogs } from "./blogs";
