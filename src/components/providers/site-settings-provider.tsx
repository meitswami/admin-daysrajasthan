"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_SITE_SETTINGS, refreshPageLabels, syncAdminTitle } from "@/lib/data/default-site-settings";
import { loadSiteSettings, saveSiteSettings } from "@/lib/site-settings/storage";
import type { SiteSettings } from "@/types/site-settings";

type SiteSettingsContextValue = {
  settings: SiteSettings;
  updateSettings: (patch: Partial<SiteSettings>) => void;
  updateWebGeneral: (patch: Partial<SiteSettings["webGeneral"]>) => void;
  updateAdminGeneral: (patch: Partial<SiteSettings["adminGeneral"]>) => void;
  updateSmtp: (patch: Partial<SiteSettings["smtp"]>) => void;
  updateWebPage: (id: string, patch: Partial<SiteSettings["webPages"][number]>) => void;
  resetToDefaults: () => void;
};

const SiteSettingsContext = createContext<SiteSettingsContextValue | null>(null);

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(loadSiteSettings());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveSiteSettings(settings);
  }, [settings, hydrated]);

  const commit = useCallback((next: SiteSettings) => {
    setSettings(refreshPageLabels(syncAdminTitle(next)));
  }, []);

  const updateSettings = useCallback(
    (patch: Partial<SiteSettings>) => {
      commit({ ...settings, ...patch });
    },
    [commit, settings]
  );

  const updateWebGeneral = useCallback(
    (patch: Partial<SiteSettings["webGeneral"]>) => {
      commit({ ...settings, webGeneral: { ...settings.webGeneral, ...patch } });
    },
    [commit, settings]
  );

  const updateAdminGeneral = useCallback(
    (patch: Partial<SiteSettings["adminGeneral"]>) => {
      commit({ ...settings, adminGeneral: { ...settings.adminGeneral, ...patch } });
    },
    [commit, settings]
  );

  const updateSmtp = useCallback(
    (patch: Partial<SiteSettings["smtp"]>) => {
      commit({ ...settings, smtp: { ...settings.smtp, ...patch } });
    },
    [commit, settings]
  );

  const updateWebPage = useCallback(
    (id: string, patch: Partial<SiteSettings["webPages"][number]>) => {
      commit({
        ...settings,
        webPages: settings.webPages.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      });
    },
    [commit, settings]
  );

  const resetToDefaults = useCallback(() => {
    commit(DEFAULT_SITE_SETTINGS);
  }, [commit]);

  const value = useMemo(
    () => ({
      settings,
      updateSettings,
      updateWebGeneral,
      updateAdminGeneral,
      updateSmtp,
      updateWebPage,
      resetToDefaults,
    }),
    [settings, updateSettings, updateWebGeneral, updateAdminGeneral, updateSmtp, updateWebPage, resetToDefaults]
  );

  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings() {
  const ctx = useContext(SiteSettingsContext);
  if (!ctx) throw new Error("useSiteSettings must be used within SiteSettingsProvider");
  return ctx;
}
