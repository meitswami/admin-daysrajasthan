export type PlaceholderCategory =
  | "travel"
  | "india"
  | "international"
  | "destination"
  | "city"
  | "hotel"
  | "vehicle"
  | "wildlife";

export const PLACEHOLDER_IMAGES: Record<PlaceholderCategory, string> = {
  travel: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80",
  india: "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&q=80",
  international: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80",
  destination: "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800&q=80",
  city: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=800&q=80",
  hotel: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
  vehicle: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=80",
  wildlife: "https://images.unsplash.com/photo-1561731216-c3a4d994f935?w=800&q=80",
};

export function resolveCoverImage(
  url: string | null | undefined,
  category: PlaceholderCategory = "travel"
): string {
  const trimmed = url?.trim();
  return trimmed || PLACEHOLDER_IMAGES[category];
}
