export type RecordStatus = "open" | "resolved";
export type InquiryStatus = "new" | "contacted" | "quoted" | "converted" | "closed";
export type ItineraryStatus = "active" | "inactive";
export type BlogStatus = "draft" | "published";
export type DisplayMode = "grid" | "list";

export type PackageType =
  | "Local Sight Seeing"
  | "Domestic"
  | "International"
  | "Honeymoon"
  | "Friends Trip"
  | "Tirth Yatra"
  | "Family Trip";

/** One day in a master package itinerary */
export interface ItineraryDayPlan {
  day_number: number;
  title: string;
  location: string;
  description: string;
  image_urls: string[];
}

export interface Itinerary {
  id: string;
  package_name: string;
  destination: string | null;
  slug: string | null;
  pdf_url: string | null;
  cover_image_url: string | null;
  package_type: PackageType | null;
  package_duration: string | null;
  /** Website themes: Romantic & Honeymoon, Luxury & Heritage, etc. */
  themes?: string[];
  /** Website traveler styles: Solo Traveller, Couples, Family, Friends, Senior Citizens */
  traveler_styles?: string[];
  /** Normalized city tags from the public packages catalog */
  cities?: string[];
  /** Public detail URL on daysrajasthan.com */
  website_url?: string | null;
  show_on_website: boolean;
  is_trending: boolean;
  display_mode: DisplayMode;
  status: ItineraryStatus;
  download_count: number;
  created_at: string;
  updated_at: string;
  inclusions?: string[];
  exclusions?: string[];
  gallery_urls?: string[];
  /** Day-wise plan: title, location, description, images */
  days?: ItineraryDayPlan[];
  created_by_id?: string | null;
  created_by_name?: string | null;
}

export type CountryRegion = "indian" | "international";

export interface WebsiteContentItem {
  id: string;
  name: string;
  subtitle?: string | null;
  image_url?: string | null;
  /** Up to 6 gallery images (cover + extras) */
  gallery_urls?: string[];
  show_on_website: boolean;
  is_trending?: boolean;
  display_mode: DisplayMode;
  country?: string | null;
  region?: CountryRegion | null;
  /** Hotels: Google Maps / review listing URL */
  google_maps_url?: string | null;
  /** Hotels: category label e.g. Deluxe Hotels */
  category?: string | null;
  /** Hotels: city / location name */
  location?: string | null;
  /** Hotels: free-text price / night details */
  price_description?: string | null;
  /** Hotels: rating 0–5 */
  rating?: number | null;
  /** Hotels: number of reviews */
  reviews_count?: number | null;
  /** Vehicles: type e.g. Sedan, SUV */
  vehicle_type?: string | null;
  /** Vehicles: seating capacity */
  capacity?: string | null;
  created_at: string;
  created_by_id?: string | null;
  created_by_name?: string | null;
  updated_at?: string;
}

export interface WebsiteModuleVisibility {
  module: string;
  label: string;
  count: number;
  show_on_website: boolean;
}

export interface DashboardStats {
  totalContactQueries: number;
  totalInquiries: number;
  totalItineraryDownloads: number;
  totalBlogs: number;
  totalWhatsappLeads: number;
}

export interface ItineraryDownload {
  id: string;
  itinerary_id: string | null;
  customer_name: string;
  email: string;
  phone: string | null;
  destination: string | null;
  package_name: string;
  source_page: string | null;
  downloaded_at: string;
  synced_to_crm: boolean;
}

export interface ContactQuery {
  id: string;
  name: string;
  email: string;
  mobile: string | null;
  subject: string | null;
  message: string;
  status: RecordStatus;
  created_at: string;
}

export interface PackageInquiry {
  id: string;
  customer_name: string;
  mobile: string;
  email: string;
  destination: string | null;
  travel_date: string | null;
  adults: number;
  children: number;
  budget: string | null;
  additional_requirements: string | null;
  status: InquiryStatus;
  source_page: string | null;
  created_at: string;
}

export interface Blog {
  id: string;
  title: string;
  slug: string;
  featured_image_url: string | null;
  content_html: string | null;
  meta_title: string | null;
  meta_description: string | null;
  keywords: string[] | null;
  category_id: string | null;
  status: BlogStatus;
  publish_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsappLead {
  id: string;
  customer_name: string | null;
  phone: string;
  selected_package: string | null;
  destination: string | null;
  source_page: string | null;
  landing_url: string | null;
  created_at: string;
  synced_to_crm: boolean;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
}

export interface CrmSyncLog {
  id: string;
  entity_type: "contact" | "inquiry" | "download" | "whatsapp";
  entity_id: string;
  status: "pending" | "success" | "failed";
  created_at: string;
}

export type ActivityItem = {
  id: string;
  type: "Inquiry" | "Download" | "WhatsApp" | "Contact";
  title: string;
  time: string;
  status: string;
};
