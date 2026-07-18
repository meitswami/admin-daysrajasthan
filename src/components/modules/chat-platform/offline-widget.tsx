"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PublicWidgetConfig } from "@/modules/chat";
import { buildChatSuggestionTips } from "@/modules/chat/suggestion-tips";

type PackageLink = {
  id: string;
  name: string;
  summary: string | null;
  href: string | null;
};

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  meta?: string | null;
  packages?: PackageLink[];
};

function normalizeHref(href: string | null): string | null {
  if (!href) return null;
  if (/^https?:\/\//i.test(href)) return href;
  if (!href.startsWith("/")) return `/${href}`;
  return href;
}

function extractPackageLinks(presentation: unknown[] | undefined): PackageLink[] {
  if (!Array.isArray(presentation)) return [];
  return presentation
    .filter((block): block is Record<string, unknown> => !!block && typeof block === "object")
    .filter((block) => block.kind === "package_card")
    .map((block, index) => ({
      id: typeof block.packageId === "string" && block.packageId ? block.packageId : `pkg_${index}`,
      name:
        typeof block.name === "string" && block.name
          ? block.name
          : typeof block.title === "string" && block.title
            ? block.title
            : "Package",
      summary:
        typeof block.summary === "string"
          ? block.summary
          : typeof block.subtitle === "string"
            ? block.subtitle
            : null,
      href: normalizeHref(typeof block.href === "string" ? block.href : null),
    }))
    .filter((pkg, index, all) => all.findIndex((item) => item.href === pkg.href && item.name === pkg.name) === index);
}

/**
 * Travel Days Chat Widget — Offline leave-a-message OR AI assistant (same shell).
 */
export function OfflineChatWidget() {
  const [config, setConfig] = useState<PublicWidgetConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [detailsCaptured, setDetailsCaptured] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const key = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("key") ?? "";
  }, []);

  const lastUserText = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === "user") return messages[i]!.text;
    }
    return null;
  }, [messages]);

  const lastAssistantPackages = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (m?.role === "assistant" && m.packages?.length) {
        return m.packages.map((p) => p.name);
      }
    }
    return [];
  }, [messages]);

  const suggestionTips = useMemo(
    () =>
      buildChatSuggestionTips({
        lastUserText,
        packageTitles: lastAssistantPackages,
      }).slice(0, 3),
    [lastUserText, lastAssistantPackages]
  );

  useEffect(() => {
    const el = transcriptRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  useEffect(() => {
    if (!key) {
      setError("Missing widget key");
      return;
    }
    void fetch(`/api/chat/widget/config?key=${encodeURIComponent(key)}`)
      .then(async (res) => {
        const json = (await res.json()) as {
          success: boolean;
          message?: string;
          data?: PublicWidgetConfig;
        };
        if (!json.success || !json.data) {
          setError(json.message ?? "Invalid key");
          return;
        }
        setConfig(json.data);
        // Skip lead fields when collectVisitorDetails is off — start with message only
        if (!json.data.behaviour.collectVisitorDetails) {
          setDetailsCaptured(true);
        }
        if (json.data.appearance.welcomeBody) {
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              text: json.data.appearance.welcomeBody,
              meta:
                json.data.aiMode === "ai"
                  ? "AI Travel Assistant"
                  : json.data.aiMode === "disabled"
                    ? "Disabled"
                    : "Offline / leave a message",
            },
          ]);
        }
      })
      .catch(() => setError("Failed to load widget"));
  }, [key]);

  async function sendText(raw: string) {
    if (!key || !raw.trim() || !config || sending) return;
    setSending(true);
    setStatus(null);

    const text = raw.trim();
    setMessages((prev) => [
      ...prev,
      { id: `u_${Date.now()}`, role: "user", text },
    ]);
    setMessage("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          message: text,
          sessionId,
          name: config.behaviour.collectVisitorDetails ? name : undefined,
          email: config.behaviour.collectVisitorDetails ? email : undefined,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        message?: string;
        data?: {
          sessionId: string;
          replyText: string;
          mode: string;
          presentation?: unknown[];
          analytics?: { providerUsed?: string; usedFallback?: boolean; searchHits?: number };
          offlineQueued?: boolean;
        };
      };

      if (!json.success || !json.data) {
        setStatus(json.message ?? "Request failed");
        setMessages((prev) => [
          ...prev,
          {
            id: `a_${Date.now()}`,
            role: "assistant",
            text: json.message ?? "Something went wrong. Please try again.",
          },
        ]);
        return;
      }

      const data = json.data;
      setSessionId(data.sessionId);
      if (config.behaviour.collectVisitorDetails) {
        setDetailsCaptured(true);
      }
      const metaBits = [
        data.mode === "ai" ? "AI" : "Offline",
        data.analytics?.providerUsed && data.analytics.providerUsed !== "none"
          ? `provider:${data.analytics.providerUsed}`
          : null,
        data.analytics?.usedFallback ? "fallback" : null,
        data.analytics?.searchHits != null
          ? `hits:${data.analytics.searchHits}`
          : null,
      ].filter(Boolean);

      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: "assistant",
          text: data.replyText,
          meta: metaBits.join(" · ") || null,
          packages: extractPackageLinks(data.presentation),
        },
      ]);
      if (data.offlineQueued) {
        setStatus(data.replyText);
      }
    } catch {
      setStatus("Network error");
    } finally {
      setSending(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await sendText(message);
  }

  function onComposerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter") return;
    if (e.shiftKey) return; // Shift+Enter = new line
    e.preventDefault();
    if (!sending && message.trim()) {
      void sendText(message);
    }
  }

  if (error) {
    return (
      <div className="flex h-[560px] items-center justify-center p-6 text-center text-sm text-stone-600">
        {error}
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex h-[560px] items-center justify-center text-sm text-stone-500">
        Loading chat…
      </div>
    );
  }

  const a = config.appearance;
  const collectDetails = config.behaviour.collectVisitorDetails;
  const disabled = !config.enabled || config.aiMode === "disabled";
  const headerSub =
    disabled
      ? "Chat disabled"
      : config.aiMode === "ai"
        ? "AI Travel Assistant"
        : "Offline / leave a message";
  const showTips = !disabled && config.aiMode === "ai" && !sending && suggestionTips.length > 0;

  return (
    <div
      className="flex h-[560px] flex-col overflow-hidden border border-stone-200 bg-white shadow-xl"
      style={{ borderRadius: a.borderRadiusPx }}
    >
      <header className="shrink-0 px-4 py-2.5 text-white" style={{ background: a.primaryColor }}>
        <p className="text-sm font-semibold leading-tight">{a.welcomeTitle}</p>
        <p className="mt-0.5 text-[11px] opacity-90">{headerSub}</p>
      </header>

      <div
        ref={transcriptRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 text-sm text-stone-700"
      >
        {disabled ? (
          <div className="rounded-xl bg-stone-100 px-3 py-2">
            Chat is currently disabled for this website.
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "ml-8 rounded-xl px-3 py-2 text-white"
                  : "mr-4 rounded-xl bg-stone-100 px-3 py-2"
              }
              style={m.role === "user" ? { background: a.primaryColor } : undefined}
            >
              <p className="whitespace-pre-wrap">{m.text}</p>
              {m.role === "assistant" && !!m.packages?.length && (
                <div className="mt-3 space-y-2">
                  {m.packages.map((pkg) =>
                    pkg.href ? (
                      <a
                        key={pkg.id}
                        href={pkg.href}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 transition hover:border-[#7A1F1F]/40 hover:bg-stone-50"
                      >
                        <span className="font-medium text-[#7A1F1F]">{pkg.name}</span>
                        {pkg.summary ? (
                          <span className="mt-0.5 block text-xs text-stone-500">{pkg.summary}</span>
                        ) : null}
                        <span className="mt-1.5 block text-xs font-medium text-[#7A1F1F]">
                          View details →
                        </span>
                      </a>
                    ) : (
                      <div
                        key={pkg.id}
                        className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800"
                      >
                        <span className="font-medium">{pkg.name}</span>
                        {pkg.summary ? (
                          <span className="mt-0.5 block text-xs text-stone-500">{pkg.summary}</span>
                        ) : null}
                      </div>
                    )
                  )}
                </div>
              )}
              {m.meta && (
                <p className="mt-1 text-[10px] opacity-70">{m.meta}</p>
              )}
            </div>
          ))
        )}
        {sending && (
          <p className="text-xs text-stone-400">Thinking…</p>
        )}
        {!disabled && config.aiMode === "offline" && (
          <p className="text-xs text-stone-500">{config.behaviour.businessHoursNote}</p>
        )}
        {status && config.aiMode === "offline" && (
          <div
            className="rounded-xl px-3 py-2 text-xs"
            style={{ background: `${a.accentColor}22`, color: a.primaryColor }}
          >
            {status}
          </div>
        )}
      </div>

      {!disabled && (
        <form
          onSubmit={onSubmit}
          className="shrink-0 space-y-1.5 border-t border-stone-100 bg-white px-3 py-2"
        >
          {collectDetails && !detailsCaptured ? (
            <>
              {config.behaviour.collectEmail && (
                <input
                  className="w-full rounded-lg border border-stone-200 px-3 py-1.5 text-sm"
                  placeholder="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}
              <input
                className="w-full rounded-lg border border-stone-200 px-3 py-1.5 text-sm"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </>
          ) : (
            collectDetails &&
            (name.trim() || email.trim()) && (
              <p className="truncate text-[10px] text-stone-500">
                Chatting as {[name.trim(), email.trim()].filter(Boolean).join(" · ")}
              </p>
            )
          )}

          {showTips && (
            <div className="-mx-0.5 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {suggestionTips.map((tip) => (
                <button
                  key={tip}
                  type="button"
                  disabled={sending}
                  title={tip}
                  onClick={() => void sendText(tip)}
                  className="shrink-0 max-w-[200px] truncate rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[10px] leading-none text-stone-600 transition hover:border-[#7A1F1F]/35 hover:bg-white hover:text-[#7A1F1F] disabled:opacity-60"
                >
                  {tip}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <textarea
              required
              rows={1}
              className="max-h-20 min-h-[38px] w-full flex-1 resize-none rounded-lg border border-stone-200 px-3 py-2 text-sm leading-snug"
              placeholder={
                config.aiMode === "ai"
                  ? "Ask about packages or destinations…"
                  : "Type your message…"
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={onComposerKeyDown}
            />
            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium text-white disabled:opacity-60"
              style={{ background: a.primaryColor }}
            >
              {sending ? "…" : "Send"}
            </button>
          </div>
          {a.showBranding && (
            <p className="text-center text-[9px] leading-none text-stone-400">
              Powered by Travel Days
            </p>
          )}
        </form>
      )}
    </div>
  );
}
