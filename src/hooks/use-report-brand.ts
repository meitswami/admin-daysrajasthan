"use client";

import { useMemo } from "react";
import { useSiteSettings } from "@/components/providers/site-settings-provider";
import { getReportBrand, type ReportBrand } from "@/lib/branding/report-brand";

export function useReportBrand(): ReportBrand {
  const { settings } = useSiteSettings();
  return useMemo(() => getReportBrand(settings), [settings]);
}
