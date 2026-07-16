import { DEFAULT_SITE_SETTINGS } from "@/lib/data/default-site-settings";
import type { SiteSettings } from "@/types/site-settings";

const STORAGE_KEY = "travel-days-site-settings";

export function loadSiteSettings(): SiteSettings {
  if (typeof window === "undefined") return DEFAULT_SITE_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SITE_SETTINGS;
    const parsed = JSON.parse(raw) as SiteSettings;
    return mergeSiteSettings(DEFAULT_SITE_SETTINGS, parsed);
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

export function saveSiteSettings(settings: SiteSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function mergeSiteSettings(base: SiteSettings, stored: Partial<SiteSettings>): SiteSettings {
  return {
    webGeneral: { ...base.webGeneral, ...stored.webGeneral },
    webPages: stored.webPages?.length ? stored.webPages : base.webPages,
    adminGeneral: { ...base.adminGeneral, ...stored.adminGeneral },
    smtp: { ...base.smtp, ...stored.smtp },
  };
}

export { DEFAULT_SITE_SETTINGS };
