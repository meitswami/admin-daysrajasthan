/**
 * Feature flags — in-memory defaults; future remote config without API changes.
 */

const FLAGS: Record<string, boolean> = {
  "public.contact": true,
  "public.inquiry": true,
  "public.whatsapp-lead": true,
  "public.itinerary-download": true,
  "public.site-settings": true,
  "search.global": true,
  "quotation.public": true,
  "crm.sync": true,
};

/**
 * Read a feature flag (default true if unknown — opt-out style for existing routes).
 */
export function isFeatureEnabled(flag: string | null | undefined): boolean {
  if (!flag) return true;
  return FLAGS[flag] ?? true;
}

/**
 * Snapshot of flags relevant to a request.
 */
export function getFeatureFlagSnapshot(flag?: string | null): Record<string, boolean> {
  if (!flag) return { ...FLAGS };
  return { [flag]: isFeatureEnabled(flag) };
}

/**
 * Override flag (tests / admin tooling later).
 */
export function setFeatureFlag(flag: string, enabled: boolean): void {
  FLAGS[flag] = enabled;
}
