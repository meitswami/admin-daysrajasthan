/**
 * Embed snippet generators — one-click copy targets for admin UI.
 */

import type { EmbedFormat, EmbedSnippet } from "../types";

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function isLoopbackHost(host: string): boolean {
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function resolvePublicBaseUrl(explicit?: string | null): string {
  if (explicit) return stripTrailingSlash(explicit);
  if (typeof window !== "undefined") return window.location.origin;
  return stripTrailingSlash(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
}

/**
 * Public origin for widget script/iframe URLs behind reverse proxies.
 * Prefer forwarded Host (nginx) over env so a leftover localhost APP_URL
 * cannot poison production iframe src.
 */
export function resolveRequestPublicOrigin(request: Request): string {
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
    return `${forwardedProto}://${forwardedHost}`;
  }

  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) {
    try {
      const parsed = new URL(envUrl);
      if (!isLoopbackHost(parsed.host)) {
        return stripTrailingSlash(envUrl);
      }
    } catch {
      // ignore invalid NEXT_PUBLIC_APP_URL
    }
  }

  return new URL(request.url).origin;
}

export function generateEmbedSnippets(input: {
  baseUrl?: string | null;
  widgetKey: string;
  websiteSlug?: string;
}): EmbedSnippet[] {
  const base = resolvePublicBaseUrl(input.baseUrl);
  const key = input.widgetKey;
  const iframeSrc = `${base}/embed/chat?key=${encodeURIComponent(key)}`;
  const configUrl = `${base}/api/chat/widget/config?key=${encodeURIComponent(key)}`;
  const scriptUrl = `${base}/api/chat/widget/script?key=${encodeURIComponent(key)}`;

  return [
    {
      format: "script",
      label: "Widget Script",
      language: "html",
      code: `<!-- Travel Days Chat Widget -->\n<script src="${scriptUrl}" async></script>`,
    },
    {
      format: "react",
      label: "React Component",
      language: "tsx",
      code: `import { useEffect } from "react";\n\nexport function TravelDaysChatWidget() {\n  useEffect(() => {\n    const s = document.createElement("script");\n    s.src = "${scriptUrl}";\n    s.async = true;\n    document.body.appendChild(s);\n    return () => { s.remove(); };\n  }, []);\n  return null;\n}`,
    },
    {
      format: "nextjs",
      label: "Next.js Component",
      language: "tsx",
      code: `"use client";\n\nimport Script from "next/script";\n\nexport function TravelDaysChatWidget() {\n  return (\n    <Script src="${scriptUrl}" strategy="afterInteractive" />\n  );\n}`,
    },
    {
      format: "iframe",
      label: "Iframe Embed",
      language: "html",
      code: `<iframe\n  src="${iframeSrc}"\n  title="Travel Days Chat"\n  style="position:fixed;right:16px;bottom:16px;width:380px;height:560px;border:0;border-radius:16px;z-index:9999;"\n  allow="clipboard-write"\n></iframe>`,
    },
    {
      format: "api_endpoint",
      label: "API Endpoint",
      language: "text",
      code: `GET ${configUrl}\nHeader (optional future): x-td-widget-key: ${key}\n\nReturns public widget config for the live AI travel assistant.`,
    },
  ];
}

export function getEmbedSnippet(
  format: EmbedFormat,
  input: { baseUrl?: string | null; widgetKey: string }
): EmbedSnippet {
  const all = generateEmbedSnippets(input);
  const hit = all.find((s) => s.format === format);
  if (!hit) throw new Error(`Unknown embed format: ${format}`);
  return hit;
}

export const SUBMODULE = {
  parent: "chat" as const,
  id: "embed" as const,
  description: "Widget script / React / Next / iframe / API embed generators",
} as const;
