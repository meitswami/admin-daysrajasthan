/**
 * Canonical origins for shareable admin links (proposals) and
 * client-facing quotation URLs on the public marketing site.
 */

import {
  clampPreviewTheme,
  type PreviewThemeId,
} from "@/lib/itinerary-builder/preview-themes";
import { encodeThemeToken } from "@/lib/itinerary-builder/theme-token";

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function isLoopbackHost(host: string): boolean {
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function isLoopbackUrl(url: string): boolean {
  try {
    return isLoopbackHost(new URL(url).host);
  } catch {
    return false;
  }
}

/** Default production admin host when env / request origin is loopback. */
export const DEFAULT_ADMIN_PUBLIC_ORIGIN = "https://admin.daysrajasthan.com";

/**
 * Public origin for shareable admin URLs (proposals, internal tools).
 * Prefer browser host when not loopback; else NEXT_PUBLIC_APP_URL; else production default.
 */
export function getAdminPublicOrigin(explicit?: string | null): string {
  if (explicit?.trim() && !isLoopbackUrl(explicit)) {
    return stripTrailingSlash(explicit.trim());
  }

  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (!isLoopbackUrl(origin)) return origin;
  }

  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl && !isLoopbackUrl(envUrl)) {
    return stripTrailingSlash(envUrl);
  }

  return DEFAULT_ADMIN_PUBLIC_ORIGIN;
}

/**
 * Client-shareable quotation URL (served by this admin app, not the marketing site):
 * https://admin.daysrajasthan.com/{id}/quotation?v=…
 *
 * The marketing host (daysrajasthan.com) is a separate Next app and has no
 * `/{id}/quotation` route — linking there 404s. Prefer `origin` when provided
 * (e.g. request host from email send); otherwise use the admin public origin.
 */
export function publicQuotationUrl(
  itineraryId: string,
  origin?: string | null,
  themeId?: PreviewThemeId | null
): string {
  const base = `${getAdminPublicOrigin(origin)}/${itineraryId}/quotation`;
  if (themeId == null) return base;
  const token = encodeThemeToken(clampPreviewTheme(themeId));
  return `${base}?v=${encodeURIComponent(token)}`;
}

/**
 * Server-side origin from an incoming Request (nginx → PM2 on :3102).
 * Prefer forwarded Host; never return localhost when a public env/default exists.
 */
export function resolveAdminRequestOrigin(request: Request): string {
  const forwardedHost = (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    ""
  )
    .split(",")[0]
    ?.trim();
  const forwardedProto = (
    request.headers.get("x-forwarded-proto") ??
    new URL(request.url).protocol.replace(":", "") ??
    "https"
  )
    .split(",")[0]
    ?.trim();

  if (forwardedHost && !isLoopbackHost(forwardedHost)) {
    return `${forwardedProto === "http" && forwardedHost.includes("daysrajasthan.com") ? "https" : forwardedProto}://${forwardedHost}`;
  }

  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl && !isLoopbackUrl(envUrl)) {
    return stripTrailingSlash(envUrl);
  }

  const requestOrigin = new URL(request.url).origin;
  if (!isLoopbackUrl(requestOrigin)) return requestOrigin;

  return DEFAULT_ADMIN_PUBLIC_ORIGIN;
}
