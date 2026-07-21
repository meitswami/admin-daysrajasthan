import type { WebsiteContentItem, WebsiteModuleVisibility } from "@/types/database";

export const websiteModuleVisibility: WebsiteModuleVisibility[] = [
  { module: "countries", label: "Countries", count: 6, show_on_website: true },
  { module: "destinations", label: "Locations", count: 24, show_on_website: true },
  { module: "cities", label: "Cities", count: 18, show_on_website: true },
  { module: "packages", label: "Packages", count: 5, show_on_website: true },
  { module: "hotels", label: "Hotels", count: 15, show_on_website: true },
  { module: "vehicles", label: "Vehicles", count: 16, show_on_website: true },
  { module: "blogs", label: "Blogs", count: 2, show_on_website: true },
];

export const countries: WebsiteContentItem[] = [
  {
    id: "c-001",
    name: "India",
    image_url: "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&q=80",
    region: "indian",
    show_on_website: true,
    display_mode: "list",
    created_at: "2026-01-01T08:00:00Z",
  },
  {
    id: "c-002",
    name: "Dubai",
    image_url: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80",
    region: "international",
    show_on_website: true,
    display_mode: "list",
    created_at: "2026-01-01T08:00:00Z",
  },
  {
    id: "c-003",
    name: "Thailand",
    image_url: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79d?w=800&q=80",
    region: "international",
    show_on_website: true,
    display_mode: "list",
    created_at: "2026-01-01T08:00:00Z",
  },
  {
    id: "c-004",
    name: "Singapore",
    image_url: "https://images.unsplash.com/photo-1525626924217-75f315a58484?w=800&q=80",
    region: "international",
    show_on_website: true,
    display_mode: "list",
    created_at: "2026-01-01T08:00:00Z",
  },
  {
    id: "c-005",
    name: "Bali",
    image_url: "https://images.unsplash.com/photo-1537996194471-f3576c4a2c5e?w=800&q=80",
    region: "international",
    show_on_website: false,
    display_mode: "list",
    created_at: "2026-01-01T08:00:00Z",
  },
  {
    id: "c-006",
    name: "Mauritius",
    image_url: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80",
    region: "international",
    show_on_website: true,
    display_mode: "list",
    created_at: "2026-01-01T08:00:00Z",
  },
];

export const destinations: WebsiteContentItem[] = [
  { id: "d-001", name: "Jaipur", subtitle: "Rajasthan Heritage", country: "India", image_url: "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&q=80", show_on_website: true, is_trending: true, display_mode: "list", created_at: "2026-01-05T08:00:00Z" },
  { id: "d-002", name: "Udaipur", subtitle: "City of Lakes", country: "India", image_url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80", show_on_website: true, display_mode: "list", created_at: "2026-01-05T08:00:00Z" },
  { id: "d-003", name: "Jaisalmer", subtitle: "Desert Gateway", country: "India", image_url: "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800&q=80", show_on_website: true, is_trending: true, display_mode: "list", created_at: "2026-01-05T08:00:00Z" },
  { id: "d-004", name: "Gujarat", subtitle: "Cultural Trail", country: "India", image_url: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&q=80", show_on_website: true, display_mode: "list", created_at: "2026-01-05T08:00:00Z" },
];

export const cities: WebsiteContentItem[] = [
  { id: "ci-001", name: "Jaipur City", subtitle: "Pink City", country: "India", image_url: "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&q=80", show_on_website: true, display_mode: "list", created_at: "2026-01-08T08:00:00Z" },
  { id: "ci-002", name: "Udaipur City", subtitle: "Lake District", country: "India", image_url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80", show_on_website: true, display_mode: "list", created_at: "2026-01-08T08:00:00Z" },
  { id: "ci-003", name: "Jodhpur", subtitle: "Blue City", country: "India", image_url: "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800&q=80", show_on_website: true, display_mode: "list", created_at: "2026-01-08T08:00:00Z" },
];

export const hotels: WebsiteContentItem[] = [
  { id: "h-001", name: "Heritage Palace Hotel", subtitle: "Jaipur · 5 Star", country: "India", image_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80", show_on_website: true, display_mode: "list", created_at: "2026-01-10T08:00:00Z" },
  { id: "h-002", name: "Lake View Resort", subtitle: "Udaipur · 4 Star", country: "India", image_url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80", show_on_website: true, display_mode: "list", created_at: "2026-01-10T08:00:00Z" },
  { id: "h-003", name: "Desert Camp Luxury", subtitle: "Jaisalmer", country: "India", image_url: "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800&q=80", show_on_website: false, display_mode: "list", created_at: "2026-01-10T08:00:00Z" },
];

export const vehicles: WebsiteContentItem[] = [
  { id: "v-001", name: "Toyota Innova", subtitle: "SUV · 7 Seater", image_url: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=80", show_on_website: true, display_mode: "list", created_at: "2026-01-12T08:00:00Z" },
  { id: "v-002", name: "Tempo Traveller", subtitle: "Group · 12 Seater", image_url: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80", show_on_website: true, display_mode: "list", created_at: "2026-01-12T08:00:00Z" },
  { id: "v-003", name: "Mercedes E Class", subtitle: "Luxury Sedan", image_url: "https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800&q=80", show_on_website: true, display_mode: "list", created_at: "2026-01-12T08:00:00Z" },
];
