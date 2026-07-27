import type { ItinerarySnapshot } from "@/types/itinerary-builder";
import {
  clampPreviewTheme,
  type PreviewThemeId,
} from "@/lib/itinerary-builder/preview-themes";

/**
 * Opaque theme lock for public quotation URLs.
 * Looks like random base64 — not `theme1` / `theme2`.
 * Token binds the visual theme so later admin theme changes do not alter shared links.
 */

const TOKEN_KEY = "DaysRajasthan·QTheme·v1·7f3a9c2e";

function keyBytes(): number[] {
  return Array.from(new TextEncoder().encode(TOKEN_KEY));
}

function xorBytes(data: Uint8Array, key: number[]): Uint8Array {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    out[i] = data[i]! ^ key[i % key.length]!;
  }
  return out;
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  const b64 =
    typeof btoa === "function"
      ? btoa(bin)
      : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(token: string): Uint8Array {
  const pad = token.length % 4 === 0 ? "" : "=".repeat(4 - (token.length % 4));
  const b64 = token.replace(/-/g, "+").replace(/_/g, "/") + pad;
  if (typeof atob === "function") {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, "base64"));
}

/** Build an opaque lock token for a theme (1–5). Each call yields a unique string. */
export function encodeThemeToken(themeId: PreviewThemeId): string {
  const theme = clampPreviewTheme(themeId);
  const nonce =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  const stamp = Date.now().toString(36);
  // Nonce first so XOR output does not share a visible common prefix across themes.
  const plain = `${nonce}|${stamp}|qt|${theme}`;
  return b64urlEncode(xorBytes(new TextEncoder().encode(plain), keyBytes()));
}

/** Decode a theme lock token. Returns null if tampered / invalid. */
export function decodeThemeToken(token: string | null | undefined): PreviewThemeId | null {
  if (!token || typeof token !== "string") return null;
  const cleaned = token.trim();
  if (!cleaned || cleaned.length > 200) return null;
  try {
    const plain = new TextDecoder().decode(xorBytes(b64urlDecode(cleaned), keyBytes()));
    const match = /^[A-Za-z0-9]+\|[A-Za-z0-9]+\|qt\|([1-5])$/.exec(plain);
    if (!match) return null;
    return clampPreviewTheme(Number(match[1]));
  } catch {
    return null;
  }
}

/** Force snapshot.preview_theme from a URL lock token when present. */
export function applyPinnedTheme(
  snapshot: ItinerarySnapshot,
  token: string | null | undefined
): ItinerarySnapshot {
  const pinned = decodeThemeToken(token);
  if (!pinned || snapshot.preview_theme === pinned) return snapshot;
  return { ...snapshot, preview_theme: pinned };
}
