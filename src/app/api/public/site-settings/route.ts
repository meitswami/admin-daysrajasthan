import { DEFAULT_SITE_SETTINGS } from "@/lib/data/default-site-settings";
import { runGateway } from "@/modules/api-gateway";

export async function GET(request: Request) {
  return runGateway(request, {
    routeId: "public.site-settings",
    auth: "anonymous",
    permission: "public.site-settings",
    featureFlag: "public.site-settings",
    handler: async () => {
      const g = DEFAULT_SITE_SETTINGS.webGeneral;
      const a = DEFAULT_SITE_SETTINGS.adminGeneral;
      return {
        data: {
          mode: "demo" as const,
          site_name: g.site_name,
          site_short_name: g.site_short_name,
          site_description: g.site_description,
          site_logo_url: g.site_logo_url,
          site_favicon_url: g.site_favicon_url,
          copyright_html: g.copyright_html,
          contact: {
            email: g.contact_email,
            phone: g.contact_phone,
            address: g.contact_address,
            website_url: g.website_url,
          },
          social: {
            facebook: a.facebook_url,
            twitter: a.twitter_url,
            youtube: a.youtube_url,
            instagram: a.instagram_url,
          },
          pages: DEFAULT_SITE_SETTINGS.webPages
            .filter((p) => p.is_published)
            .map((p) => ({
              slug: p.slug,
              title: p.title,
              content_html: p.content_html,
            })),
        },
        message: "OK",
      };
    },
  });
}
