"use client";

import { useEffect } from "react";
import { useSiteSettings } from "@/components/providers/site-settings-provider";

export function DynamicSiteMeta() {
  const { settings } = useSiteSettings();
  const favicon = settings.adminGeneral.admin_favicon_url || settings.webGeneral.site_favicon_url;
  const title = settings.adminGeneral.admin_title;

  useEffect(() => {
    if (title) document.title = title;
  }, [title]);

  useEffect(() => {
    if (!favicon) return;
    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = favicon;
  }, [favicon]);

  return null;
}
