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

export const PACKAGE_DURATIONS = [
  "1 Day 1 Night",
  "2 Days 1 Nights",
  "3 Days 2 Nights",
  "4 Days 3 Nights",
  "5 Days 4 Nights",
  "6 Days 5 Nights",
  "7 Days 6 Nights",
  "8 Days 7 Nights",
  "9 Days 8 Nights",
  "10 Days 9 Nights",
  "11 Day 10 Night",
  "12 Days 11 Nights",
  "13 Days 12 Nights",
  "14 Days 13 Nights",
  "15 Days 14 Nights",
  "16 Days 15 Nights",
  "17 Days 16 Nights",
  "18 Day 17 Night",
  "19 Days 18 Nights",
  "20 Days 19 Nights",
  "21 Days 20 Nights",
] as const;

export type PackageDuration = (typeof PACKAGE_DURATIONS)[number];

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
  { key: "destinations", label: "Destinations", color: "from-red-500 to-red-600" },
  { key: "cities", label: "Cities", color: "from-violet-500 to-violet-600" },
  { key: "packages", label: "Packages", color: "from-purple-500 to-purple-600" },
  { key: "hotels", label: "Hotels", color: "from-emerald-500 to-emerald-600" },
  { key: "vehicles", label: "Vehicles", color: "from-cyan-500 to-cyan-600" },
  { key: "blogs", label: "Blogs", color: "from-rose-500 to-rose-600" },
];
