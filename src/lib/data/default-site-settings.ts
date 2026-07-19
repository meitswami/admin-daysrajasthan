import type { SiteSettings, WebPageSetting } from "@/types/site-settings";

const SITE = "Travel Days Rajasthan";
const SHORT = "TDR";

function page(
  id: string,
  slug: string,
  label: string,
  title: string,
  content: string,
  published = true
): WebPageSetting {
  return { id, slug, label, title, content_html: content, is_published: published };
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  webGeneral: {
    site_name: SITE,
    site_short_name: SHORT,
    site_description: "Curated Rajasthan tours, heritage itineraries & travel experiences across India.",
    site_logo_url: null,
    site_favicon_url: null,
    copyright_html: `Copyright © ${new Date().getFullYear()} traveldaysrajasthan.com. All Rights Reserved.`,
    contact_email: "info@traveldaysrajasthan.com",
    contact_phone: "+91 98765 43210",
    contact_address: "Jaipur, Rajasthan, India",
    website_url: "https://traveldaysrajasthan.com",
  },
  webPages: [
    page(
      "page-about",
      "about-us",
      "About Us",
      "About Us",
      `<h2>About Us</h2><p><strong>${SITE}</strong> is a dedicated travel brand focused on Rajasthan heritage tours, desert safaris, and curated experiences across India. We help travellers discover forts, palaces, wildlife, and local culture with expert guides and transparent pricing.</p><p>From Golden Triangle circuits to bespoke honeymoon packages, ${SHORT} designs journeys that match your pace and budget.</p>`
    ),
    page(
      "page-why",
      "why-us",
      `Why ${SHORT}?`,
      `Why ${SHORT}?`,
      `<h2>Why choose ${SHORT}?</h2><ul><li>Local Rajasthan expertise & verified partners</li><li>Custom itineraries for families, groups & corporate retreats</li><li>Instant PDF downloads & WhatsApp support</li><li>Secure bookings with clear inclusions & exclusions</li></ul>`
    ),
    page(
      "page-contact",
      "contact-us",
      "Contact Us",
      "Contact Us",
      `<h2>Contact Us</h2><p>Email: info@traveldaysrajasthan.com</p><p>Phone: +91 98765 43210</p><p>Address: Jaipur, Rajasthan, India</p><p>We respond to enquiries within 24 hours on business days.</p>`
    ),
    page(
      "page-faq",
      "faq",
      "FAQ",
      "Frequently Asked Questions",
      `<h2>FAQ</h2><p><strong>How do I book a tour?</strong> Submit an inquiry or download an itinerary PDF — our team will call you with options.</p><p><strong>Do you offer international packages?</strong> Yes — we cover domestic Rajasthan tours and select international destinations.</p>`
    ),
    page(
      "page-terms",
      "terms-of-use",
      "Terms Of Use",
      "Terms Of Use",
      `<h2>Terms Of Use</h2><p>By using ${SITE} you agree to our booking terms, cancellation policy, and website usage guidelines. Content on this site is for informational purposes.</p>`
    ),
    page(
      "page-privacy",
      "privacy-policy",
      "Privacy Policy",
      "Privacy Policy",
      `<h2>Privacy Policy</h2><p>${SITE} collects contact details only to respond to travel enquiries. We do not sell personal data. Cookies may be used for analytics and form security.</p>`
    ),
    page(
      "page-refund",
      "refund-return-policy",
      "Refund & Return Policy",
      "Refund & Return Policy",
      `<h2>Refund & Return Policy</h2><p>Refunds depend on supplier cancellation rules and how close the departure date is. Our team will share applicable charges before confirming any booking.</p>`
    ),
    page(
      "page-cancel",
      "cancellation",
      "Cancellation",
      "Cancellation Policy",
      `<h2>Cancellation</h2><p>Cancellations must be submitted in writing. Partial refunds may apply based on hotel, transport, and activity vendor policies.</p>`
    ),
    page(
      "page-payments",
      "payments",
      "Payments",
      "Payments",
      `<h2>Payments</h2><p>We accept bank transfer, UPI, and major cards for confirmed bookings. Advance deposits secure your itinerary; balance is due before travel as per your quote.</p>`
    ),
  ],
  adminGeneral: {
    admin_title: `${SITE} — Admin`,
    admin_logo_url: null,
    admin_favicon_url: null,
    email: "info@traveldaysrajasthan.com",
    currency_code: "INR",
    currency_sign: "₹",
    author: SITE,
    developed_by: "Travel Days Tech",
    phone: "+91 98765 43210",
    website_url: "https://traveldaysrajasthan.com",
    facebook_url: "https://www.facebook.com/traveldaysrajasthan",
    twitter_url: "https://twitter.com/traveldaysrajasthan",
    youtube_url: "https://www.youtube.com/@traveldaysrajasthan",
    instagram_url: "https://www.instagram.com/traveldaysrajasthan",
    report_footer_text:
      "Thank you for choosing Travel Days Rajasthan. Prices subject to availability. GST extra as applicable.",
    gstin: null,
    default_advance_percent: 20,
  },
  smtp: {
    host: "mail.traveldaysrajasthan.com",
    email: "info@traveldaysrajasthan.com",
    password: "",
    secure: "TLS",
    port: "587",
  },
};

export function getBrandInitials(shortName: string): string {
  const parts = shortName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return shortName.slice(0, 2).toUpperCase() || "TD";
}

export function syncAdminTitle(settings: SiteSettings): SiteSettings {
  const expected = `${settings.webGeneral.site_name} — Admin`;
  if (settings.adminGeneral.admin_title === DEFAULT_SITE_SETTINGS.adminGeneral.admin_title || !settings.adminGeneral.admin_title) {
    return {
      ...settings,
      adminGeneral: { ...settings.adminGeneral, admin_title: expected },
    };
  }
  return settings;
}

export function refreshPageLabels(settings: SiteSettings): SiteSettings {
  const short = settings.webGeneral.site_short_name;
  return {
    ...settings,
    webPages: settings.webPages.map((p) =>
      p.slug === "why-us" ? { ...p, label: `Why ${short}?` } : p
    ),
  };
}
