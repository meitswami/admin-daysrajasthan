/**
 * Public marketing site origin (package detail pages live here, not on admin).
 */
export function getPublicWebsiteOrigin(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_WEBSITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_MARKETING_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "https://daysrajasthan.com";
}

/** Absolute package detail URL for chat / search cards. */
export function publicPackageHref(slug: string | null | undefined): string | null {
  if (!slug?.trim()) return null;
  const clean = slug.trim().replace(/^\/+/, "");
  return `${getPublicWebsiteOrigin()}/packages/${clean}`;
}

/** Absolute destination URL for chat / search cards. */
export function publicDestinationHref(slug: string | null | undefined): string | null {
  if (!slug?.trim()) return null;
  const clean = slug.trim().replace(/^\/+/, "");
  return `${getPublicWebsiteOrigin()}/destinations/${clean}`;
}
