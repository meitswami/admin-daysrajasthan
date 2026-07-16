import type { SiteSettings } from "@/types/site-settings";

export type ReportBrand = {
  companyName: string;
  shortName: string;
  logoUrl: string | null;
  email: string;
  phone: string;
  address: string;
  websiteUrl: string;
  currencySign: string;
  reportFooter: string;
  gstin: string | null;
  siteDescription: string | null;
};

export function getReportBrand(settings: SiteSettings): ReportBrand {
  const { adminGeneral, webGeneral } = settings;
  return {
    companyName: webGeneral.site_name || adminGeneral.admin_title,
    shortName: webGeneral.site_short_name,
    logoUrl: adminGeneral.admin_logo_url ?? webGeneral.site_logo_url,
    email: adminGeneral.email || webGeneral.contact_email,
    phone: adminGeneral.phone || webGeneral.contact_phone,
    address: webGeneral.contact_address,
    websiteUrl: adminGeneral.website_url || webGeneral.website_url,
    currencySign: adminGeneral.currency_sign,
    reportFooter:
      adminGeneral.report_footer_text ??
      `Thank you for choosing ${webGeneral.site_name}. This document is computer-generated.`,
    gstin: adminGeneral.gstin ?? null,
    siteDescription: webGeneral.site_description || null,
  };
}
