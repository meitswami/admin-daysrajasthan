/**
 * Secure widget API key generation (browser-safe).
 */

import { WIDGET_KEY_PREFIX } from "../constants";

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", data);
    return bytesToHex(new Uint8Array(digest));
  }
  // Fallback for non-subtle environments (demo)
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (Math.imul(31, h) + value.charCodeAt(i)) | 0;
  return `fallback_${(h >>> 0).toString(16)}_${value.length}`;
}

export async function generateWidgetSecret(): Promise<{
  secret: string;
  prefix: string;
  secretHash: string;
  secretHint: string;
}> {
  const random = new Uint8Array(24);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(random);
  } else {
    for (let i = 0; i < random.length; i++) random[i] = Math.floor(Math.random() * 256);
  }
  const body = bytesToHex(random);
  const secret = `${WIDGET_KEY_PREFIX}${body}`;
  const prefix = `${WIDGET_KEY_PREFIX}${body.slice(0, 4)}`;
  const secretHash = await sha256Hex(secret);
  const secretHint = `${prefix}…${body.slice(-4)}`;
  return { secret, prefix, secretHash, secretHint };
}

export async function hashWidgetSecret(secret: string): Promise<string> {
  return sha256Hex(secret.trim());
}

export const SUBMODULE = {
  parent: "chat" as const,
  id: "keys" as const,
  description: "Secure widget API key generation",
} as const;
