export type PreviewThemeId = 1 | 2 | 3 | 4 | 5;

export type PreviewTheme = {
  id: PreviewThemeId;
  /** Full branded label shown under the card */
  label: string;
  shortLabel: string;
  gradient: string;
  /** Page shell tint when this theme is selected */
  shell: string;
};

/** Five Complete Rajasthan Traditional Heritage Look variants (daysrajasthan.com palette). */
export const PREVIEW_THEMES: PreviewTheme[] = [
  {
    id: 1,
    label: "1 Complete Rajasthan Traditional Heritage Look",
    shortLabel: "Heritage Look 1",
    gradient: "from-[#7B1E2E] via-[#A67C2D] to-[#5C0F1A]",
    shell: "bg-[#FBF7F0]",
  },
  {
    id: 2,
    label: "2 Complete Rajasthan Traditional Heritage Look",
    shortLabel: "Heritage Look 2",
    gradient: "from-[#C45C26] via-[#E8A838] to-[#8B3A1A]",
    shell: "bg-[#FFF8F0]",
  },
  {
    id: 3,
    label: "3 Complete Rajasthan Traditional Heritage Look",
    shortLabel: "Heritage Look 3",
    gradient: "from-[#C4A574] via-[#A67C52] to-[#6B4423]",
    shell: "bg-[#FAF6F0]",
  },
  {
    id: 4,
    label: "4 Complete Rajasthan Traditional Heritage Look",
    shortLabel: "Heritage Look 4",
    gradient: "from-[#1E4D7B] via-[#3A7CA5] to-[#0D2B45]",
    shell: "bg-[#F0F5FA]",
  },
  {
    id: 5,
    label: "5 Complete Rajasthan Traditional Heritage Look",
    shortLabel: "Heritage Look 5",
    gradient: "from-[#6B1E3A] via-[#9B2D4A] to-[#3D0F1F]",
    shell: "bg-[#FBF0F3]",
  },
];

export type ThemeMixSuggestion = {
  id: string;
  title: string;
  subtitle: string;
  themeId: PreviewThemeId;
};

/** Mix suggestions inspired by Destinations By Theme on daysrajasthan.com */
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

export function themeShellClass(themeId: PreviewThemeId | undefined | null): string {
  const theme = PREVIEW_THEMES.find((t) => t.id === (themeId ?? 1));
  return theme?.shell ?? PREVIEW_THEMES[0].shell;
}
