"use client";

import { useEffect, useMemo, useState } from "react";
import type { PublicWidgetConfig } from "@/modules/chat";

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  meta?: string | null;
};

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

  const key = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("key") ?? "";
  }, []);

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key || !message.trim() || !config) return;
    setSending(true);
    setStatus(null);

    const text = message.trim();
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
          name,
          email,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        message?: string;
        data?: {
          sessionId: string;
          replyText: string;
          mode: string;
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

      setSessionId(json.data.sessionId);
      // Hide lead fields after first successful turn when we have a name/email
      if (name.trim() || email.trim() || json.data.sessionId) {
        setDetailsCaptured(true);
      }
      const metaBits = [
        json.data.mode === "ai" ? "AI" : "Offline",
        json.data.analytics?.providerUsed && json.data.analytics.providerUsed !== "none"
          ? `provider:${json.data.analytics.providerUsed}`
          : null,
        json.data.analytics?.usedFallback ? "fallback" : null,
        json.data.analytics?.searchHits != null
          ? `hits:${json.data.analytics.searchHits}`
          : null,
      ].filter(Boolean);

      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: "assistant",
          text: json.data!.replyText,
          meta: metaBits.join(" · ") || null,
        },
      ]);
      if (json.data.offlineQueued) {
        setStatus(json.data.replyText);
      }
    } catch {
      setStatus("Network error");
    } finally {
      setSending(false);
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
  const disabled = !config.enabled || config.aiMode === "disabled";
  const headerSub =
    disabled
      ? "Chat disabled"
      : config.aiMode === "ai"
        ? "AI Travel Assistant"
        : "Offline / leave a message";

  return (
    <div
      className="flex h-[560px] flex-col overflow-hidden border border-stone-200 bg-white shadow-xl"
      style={{ borderRadius: a.borderRadiusPx }}
    >
      <header className="px-4 py-3 text-white" style={{ background: a.primaryColor }}>
        <p className="text-sm font-semibold">{a.welcomeTitle}</p>
        <p className="mt-0.5 text-xs opacity-90">{headerSub}</p>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm text-stone-700">
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
              {m.meta && (
                <p className="mt-1 text-[10px] opacity-70">{m.meta}</p>
              )}
            </div>
          ))
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
        <form onSubmit={onSubmit} className="space-y-2 border-t border-stone-100 p-3">
          {!detailsCaptured ? (
            <>
              {config.behaviour.collectEmail && (
                <input
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}
              <input
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </>
          ) : (
            (name.trim() || email.trim()) && (
              <p className="truncate text-[11px] text-stone-500">
                Chatting as {[name.trim(), email.trim()].filter(Boolean).join(" · ")}
              </p>
            )
          )}
          <textarea
            required
            rows={detailsCaptured ? 2 : 3}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
            placeholder={
              config.aiMode === "ai"
                ? "Ask about packages, destinations, or a trip plan…"
                : "Type your message…"
            }
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button
            type="submit"
            disabled={sending}
            className="w-full rounded-lg px-3 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: a.primaryColor }}
          >
            {sending
              ? "Sending…"
              : config.aiMode === "ai"
                ? "Send"
                : "Send message"}
          </button>
          {a.showBranding && (
            <p className="text-center text-[10px] text-stone-400">Powered by Travel Days</p>
          )}
        </form>
      )}
    </div>
  );
}
