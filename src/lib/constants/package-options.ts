export const PACKAGE_TYPES = [
  "Local Sight Seeing",
  "Domestic",
  "International",
  "Honeymoon",
  "Friends Trip",
  "Tirth Yatra",
  "Family Trip",
] as const;

export type PackageType = (typeof PACKAGE_TYPES)[number];

function formatPackageDuration(days: number): string {
  const nights = Math.max(0, days - 1);
  const dayLabel = days === 1 ? "Day" : "Days";
  const nightLabel = nights === 1 ? "Night" : "Nights";
  return `${days} ${dayLabel} ${nights} ${nightLabel}`;
}

/** 1 Day 0 Nights … 24 Days 23 Nights */
export const PACKAGE_DURATIONS: readonly string[] = Array.from({ length: 24 }, (_, i) =>
  formatPackageDuration(i + 1)
);

export type PackageDuration = string;

export type DisplayMode = "grid" | "list";

export type WebsiteModuleKey =
  | "countries"
  | "destinations"
  | "cities"
  | "packages"
  | "hotels"
  | "vehicles"
  | "blogs";

export const WEBSITE_MODULES: { key: WebsiteModuleKey; label: string; color: string }[] = [
  { key: "countries", label: "Countries", color: "from-orange-500 to-orange-600" },
  { key: "destinations", label: "Locations", color: "from-red-500 to-red-600" },
  { key: "cities", label: "Cities", color: "from-violet-500 to-violet-600" },
  { key: "packages", label: "Packages", color: "from-purple-500 to-purple-600" },
  { key: "hotels", label: "Hotels", color: "from-emerald-500 to-emerald-600" },
  { key: "vehicles", label: "Vehicles", color: "from-cyan-500 to-cyan-600" },
  { key: "blogs", label: "Blogs", color: "from-rose-500 to-rose-600" },
];
