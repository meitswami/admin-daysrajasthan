/**
 * Knowledge Engine DTOs — canonical fact shapes for Search / Intelligence / CMS.
 * Never expose raw Supabase rows outside the repository/mapper boundary.
 */

export type KnowledgeId = string;
export type KnowledgeSlug = string;

/**
 * Generic region key for multi-state SaaS (e.g. "IN-RJ", "IN-HP", "IN-GA").
 * Never hardcode a single state in service APIs.
 */
export type RegionCode = string;

export type KnowledgeVisibility = {
  showOnWebsite: boolean;
  isTrending?: boolean;
};

export type DestinationRecord = {
  id: KnowledgeId;
  name: string;
  slug: KnowledgeSlug;
  subtitle: string | null;
  country: string | null;
  /** Optional ISO-like region code for filtering across states */
  regionCode: RegionCode | null;
  regionName: string | null;
  imageUrl: string | null;
  summary: string | null;
} & KnowledgeVisibility;

export type PackageRecord = {
  id: KnowledgeId;
  name: string;
  slug: KnowledgeSlug;
  destination: string | null;
  regionCode: RegionCode | null;
  duration: string | null;
  packageType: string | null;
  /** Website package themes (Romantic & Honeymoon, Desert & Adventure, …) */
  themes: string[];
  /** Website traveler styles (Solo Traveller, Couples, Family, Friends, Senior Citizens) */
  travelerStyles: string[];
  /** Normalized city tags */
  cities: string[];
  /** Public package URL on the marketing site */
  websiteUrl: string | null;
  coverImageUrl: string | null;
  pdfUrl: string | null;
  status: "active" | "inactive";
  displayMode: "grid" | "list";
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
} & KnowledgeVisibility;

export type PlaceRecord = {
  id: KnowledgeId;
  name: string;
  slug: KnowledgeSlug;
  destinationId: KnowledgeId | null;
  destinationName: string | null;
  regionCode: RegionCode | null;
  summary: string | null;
  imageUrl: string | null;
};

export type ActivityRecord = {
  id: KnowledgeId;
  name: string;
  slug: KnowledgeSlug;
  placeId: KnowledgeId | null;
  destinationId: KnowledgeId | null;
  regionCode: RegionCode | null;
  summary: string | null;
  durationHint: string | null;
};

export type FoodRecord = {
  id: KnowledgeId;
  name: string;
  slug: KnowledgeSlug;
  destinationId: KnowledgeId | null;
  regionCode: RegionCode | null;
  cuisine: string | null;
  summary: string | null;
};

export type HotelRecord = {
  id: KnowledgeId;
  name: string;
  slug: KnowledgeSlug;
  destinationId: KnowledgeId | null;
  destinationName: string | null;
  regionCode: RegionCode | null;
  category: string | null;
  imageUrl: string | null;
} & KnowledgeVisibility;

export type WeatherRecord = {
  id: KnowledgeId;
  destinationId: KnowledgeId;
  regionCode: RegionCode | null;
  season: string;
  summary: string;
  bestMonths: string[] | null;
};

export type CultureRecord = {
  id: KnowledgeId;
  title: string;
  slug: KnowledgeSlug;
  destinationId: KnowledgeId | null;
  regionCode: RegionCode | null;
  summary: string;
};

export type ShoppingRecord = {
  id: KnowledgeId;
  name: string;
  slug: KnowledgeSlug;
  destinationId: KnowledgeId | null;
  regionCode: RegionCode | null;
  summary: string | null;
};

export type TravelTipRecord = {
  id: KnowledgeId;
  title: string;
  slug: KnowledgeSlug;
  destinationId: KnowledgeId | null;
  regionCode: RegionCode | null;
  body: string;
  tags: string[];
};

export type FaqRecord = {
  id: KnowledgeId;
  question: string;
  answer: string;
  slug: KnowledgeSlug | null;
  category: string | null;
  regionCode: RegionCode | null;
};

export type BlogRecord = {
  id: KnowledgeId;
  title: string;
  slug: KnowledgeSlug;
  excerpt: string | null;
  contentHtml: string | null;
  featuredImageUrl: string | null;
  status: "draft" | "published";
  publishDate: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  regionCode: RegionCode | null;
};

/** Packet assembled for Intelligence prompt context (facts only). */
export type KnowledgeContextPacket = {
  query: string;
  regionCode: RegionCode | null;
  destinations: DestinationRecord[];
  packages: PackageRecord[];
  places: PlaceRecord[];
  activities: ActivityRecord[];
  foods: FoodRecord[];
  hotels: HotelRecord[];
  weather: WeatherRecord[];
  culture: CultureRecord[];
  shopping: ShoppingRecord[];
  travelTips: TravelTipRecord[];
  faqs: FaqRecord[];
  blogs: BlogRecord[];
  retrievedAt: string;
};

export type KnowledgeDomain =
  | "destinations"
  | "packages"
  | "places"
  | "activities"
  | "foods"
  | "hotels"
  | "weather"
  | "culture"
  | "shopping"
  | "travel-tips"
  | "faq"
  | "blogs";

/** Shared list filters — region-agnostic. */
export type KnowledgeListFilters = {
  regionCode?: RegionCode;
  showOnWebsiteOnly?: boolean;
  status?: "active" | "inactive";
  trendingOnly?: boolean;
  query?: string;
  limit?: number;
};

export type KnowledgeCacheKey = string;
