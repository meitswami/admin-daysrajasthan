export type SmtpSecure = "TLS" | "SSL" | "None";

export interface WebGeneralSettings {
  site_name: string;
  site_short_name: string;
  site_description: string;
  site_logo_url: string | null;
  site_favicon_url: string | null;
  copyright_html: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  website_url: string;
}

export interface WebPageSetting {
  id: string;
  slug: string;
  label: string;
  title: string;
  content_html: string;
  is_published: boolean;
}

export interface AdminGeneralSettings {
  admin_title: string;
  admin_logo_url: string | null;
  admin_favicon_url: string | null;
  email: string;
  currency_code: string;
  currency_sign: string;
  author: string;
  developed_by: string;
  phone: string;
  website_url: string;
  facebook_url: string;
  twitter_url: string;
  youtube_url: string;
  instagram_url: string;
  /** Shown on PDFs / printed reports */
  report_footer_text?: string;
  gstin?: string | null;
  /** Default advance deposit % for new itineraries (admin setting) */
  default_advance_percent?: 20 | 30;
}

export interface SmtpSettings {
  host: string;
  email: string;
  password: string;
  secure: SmtpSecure;
  port: string;
}

export interface SiteSettings {
  webGeneral: WebGeneralSettings;
  webPages: WebPageSetting[];
  adminGeneral: AdminGeneralSettings;
  smtp: SmtpSettings;
}

export type WebSettingsTab = "general" | "pages";
export type AdminSettingsTab = "general" | "smtp" | "integration" | "system";
