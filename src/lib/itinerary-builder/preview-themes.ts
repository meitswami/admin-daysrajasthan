export type PreviewThemeId = 1 | 2 | 3 | 4 | 5;

export type PreviewTheme = {
  id: PreviewThemeId;
  /** Short style name shown on selector cards */
  styleName: string;
  shortLabel: string;
  /** Card preview gradient */
  gradient: string;
  /** Page shell tint when this theme is selected */
  shell: string;
  /** Primary accent (hex) used in themed quotation */
  accent: string;
  accentSoft: string;
  heading: string;
  heroImage: string;
  gallery: string[];
};

/**
 * Five Rajasthani booking-preview themes.
 * Themes 1–3 mirror rajasthantouring SenduserviewData layouts;
 * 4–5 are companion Rajasthani setups.
 */
export const PREVIEW_THEMES: PreviewTheme[] = [
  {
    id: 1,
    styleName: "Legacy of Maharajas",
    shortLabel: "Heritage Cover",
    gradient: "from-[#C9A227] via-[#E8C547] to-[#8B6914]",
    shell: "bg-[#FFF8E7]",
    accent: "#C9A227",
    accentSoft: "#FFF3C4",
    heading: "#1e293b",
    heroImage: "/theme-assets/heritage-fort.jpg",
    gallery: [
      "/theme-assets/heritage-fort.jpg",
      "/theme-assets/heritage-palace.jpg",
      "/theme-assets/amber-gate.jpg",
      "/theme-assets/hawa-mahal.jpg",
      "/theme-assets/wildlife.jpg",
      "/theme-assets/lake-udaipur.jpg",
      "/theme-assets/circle-fort.jpg",
    ],
  },
  {
    id: 2,
    styleName: "Royal Circle Heritage",
    shortLabel: "Circle Modern",
    gradient: "from-[#F5C518] via-[#A8E063] to-[#56AB2F]",
    shell: "bg-[#FAFFF5]",
    accent: "#56AB2F",
    accentSoft: "#EEFBE3",
    heading: "#111827",
    heroImage: "/theme-assets/circle-fort.jpg",
    gallery: [
      "/theme-assets/circle-fort.jpg",
      "/theme-assets/hawa-mahal.jpg",
      "/theme-assets/amber-gate.jpg",
      "/theme-assets/lake-udaipur.jpg",
      "/theme-assets/wildlife.jpg",
      "/theme-assets/heritage-palace.jpg",
      "/theme-assets/desert-dunes.jpg",
    ],
  },
  {
    id: 3,
    styleName: "Parchment Heritage",
    shortLabel: "Maroon Parchment",
    gradient: "from-[#7B1E2E] via-[#A63D4F] to-[#4A0E18]",
    shell: "bg-[#FBF7F0]",
    accent: "#7B1E2E",
    accentSoft: "#F8E9EC",
    heading: "#1c1917",
    heroImage: "/theme-assets/amber-gate.jpg",
    gallery: [
      "/theme-assets/amber-gate.jpg",
      "/theme-assets/hawa-mahal.jpg",
      "/theme-assets/wildlife.jpg",
      "/theme-assets/lake-udaipur.jpg",
      "/theme-assets/heritage-fort.jpg",
      "/theme-assets/circle-fort.jpg",
      "/theme-assets/desert-dunes.jpg",
    ],
  },
  {
    id: 4,
    styleName: "Desert Sunset Trail",
    shortLabel: "Desert Sunset",
    gradient: "from-[#C45C26] via-[#E07A3D] to-[#8B3A1A]",
    shell: "bg-[#FFF8F0]",
    accent: "#C45C26",
    accentSoft: "#FFE8D6",
    heading: "#3b2112",
    heroImage: "/theme-assets/desert-dunes.jpg",
    gallery: [
      "/theme-assets/desert-dunes.jpg",
      "/theme-assets/circle-fort.jpg",
      "/theme-assets/heritage-fort.jpg",
      "/theme-assets/amber-gate.jpg",
      "/theme-assets/lake-udaipur.jpg",
      "/theme-assets/hawa-mahal.jpg",
      "/theme-assets/wildlife.jpg",
    ],
  },
  {
    id: 5,
    styleName: "Palace Indigo Night",
    shortLabel: "Palace Indigo",
    gradient: "from-[#1E3A5F] via-[#2E5A8C] to-[#0D1B2A]",
    shell: "bg-[#F0F4FA]",
    accent: "#1E3A5F",
    accentSoft: "#E4ECF7",
    heading: "#0f172a",
    heroImage: "/theme-assets/lake-udaipur.jpg",
    gallery: [
      "/theme-assets/lake-udaipur.jpg",
      "/theme-assets/heritage-palace.jpg",
      "/theme-assets/hawa-mahal.jpg",
      "/theme-assets/amber-gate.jpg",
      "/theme-assets/wildlife.jpg",
      "/theme-assets/circle-fort.jpg",
      "/theme-assets/desert-dunes.jpg",
    ],
  },
];

export type ThemeMixSuggestion = {
  id: string;
  title: string;
  subtitle: string;
  themeId: PreviewThemeId;
};

/** @deprecated Mix suggestions UI is hidden; kept for type compatibility. */
export const THEME_MIX_SUGGESTIONS: ThemeMixSuggestion[] = [
  {
    id: "heritage-royalty",
    title: "Heritage & Royalty",
    subtitle: "The Maharaja Life",
    themeId: 1,
  },
  {
    id: "spiritual-mystical",
    title: "Spiritual & Mystical",
    subtitle: "The Soul of Trail",
    themeId: 2,
  },
  {
    id: "adventure-desert",
    title: "Adventure & Desert Trail",
    subtitle: "Desert Adventure Tours",
    themeId: 3,
  },
  {
    id: "romantic-honeymoon",
    title: "Romantic & Honeymoon",
    subtitle: "Romantic Affairs",
    themeId: 4,
  },
  {
    id: "wildlife-wilderness",
    title: "Wildlife & Wilderness",
    subtitle: "Into the Wild",
    themeId: 5,
  },
];

export function clampPreviewTheme(value: unknown): PreviewThemeId {
  const n = Number(value);
  if (n === 2 || n === 3 || n === 4 || n === 5) return n;
  return 1;
}

export function getPreviewTheme(themeId: PreviewThemeId | undefined | null): PreviewTheme {
  return PREVIEW_THEMES.find((t) => t.id === (themeId ?? 1)) ?? PREVIEW_THEMES[0];
}

export function themeShellClass(themeId: PreviewThemeId | undefined | null): string {
  return getPreviewTheme(themeId).shell;
}

/** Dynamic theme-card label from booking preview fields. */
export function themeCardLabel(
  theme: PreviewTheme,
  booking: { title?: string | null; durationLabel?: string | null }
): string {
  const title = booking.title?.trim();
  const duration = booking.durationLabel?.trim();
  if (title && duration) return `${theme.id} · ${duration} · ${title}`;
  if (title) return `${theme.id} · ${title}`;
  if (duration) return `${theme.id} · ${duration} · ${theme.styleName}`;
  return `${theme.id} · ${theme.styleName}`;
}

export function dayGalleryImage(theme: PreviewTheme, dayNumber: number): string {
  const list = theme.gallery;
  return list[(Math.max(1, dayNumber) - 1) % list.length] ?? theme.heroImage;
}
