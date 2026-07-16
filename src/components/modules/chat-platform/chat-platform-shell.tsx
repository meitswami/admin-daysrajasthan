"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageMain } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import { Toggle } from "@/components/ui/toggle";
import {
  CHAT_PLATFORM_SECTIONS,
  LOCAL_DEMO_WIDGET_KEY,
  addAllowedDomain,
  buildEmbedSnippets,
  createWebsite,
  createWidgetKey,
  getAnalyticsSnapshot,
  getChatPlatformState,
  getDefaultWebsite,
  listAllowedDomains,
  listWidgetKeys,
  removeAllowedDomain,
  revokeWidgetKey,
  updateAppearance,
  updateBehaviour,
  updateKnowledgeScope,
  updatePlatformSettings,
  updatePrompt,
  updateProviders,
  updateWebsite,
  type ChatPlatformState,
  type EmbedSnippet,
  type WidgetApiKey,
} from "@/modules/chat";
import { cn } from "@/lib/utils";
import { Copy, Plus, Trash2 } from "lucide-react";

export type ChatPlatformSectionId =
  (typeof CHAT_PLATFORM_SECTIONS)[number]["id"];

function CopyBlock({ title, code }: { title: string; code: string }) {
  const { show } = useToast();
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50">
      <div className="flex items-center justify-between border-b border-stone-200 px-3 py-2">
        <p className="text-sm font-medium text-stone-800">{title}</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            show("Copied to clipboard");
          }}
        >
          <Copy className="h-3.5 w-3.5" />
          Copy
        </Button>
      </div>
      <pre className="max-h-64 overflow-auto p-3 text-[11px] leading-relaxed text-stone-700 whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  );
}

export function ChatPlatformShell({ section }: { section: ChatPlatformSectionId }) {
  const { show } = useToast();
  const [state, setState] = useState<ChatPlatformState | null>(null);
  const [websiteId, setWebsiteId] = useState<string>("");
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [snippets, setSnippets] = useState<EmbedSnippet[]>([]);
  const [embedKey, setEmbedKey] = useState(LOCAL_DEMO_WIDGET_KEY);

  const refresh = useCallback(() => {
    const next = getChatPlatformState();
    setState(next);
    const def = getDefaultWebsite();
    setWebsiteId((prev) => prev || def?.id || next.websites[0]?.id || "");
    void fetch("/api/chat/platform/sync")
      .then(async (res) => {
        const json = (await res.json()) as {
          data?: { conversations?: ChatPlatformState["conversations"]; feedback?: ChatPlatformState["feedback"] };
        };
        if (!json.data?.conversations && !json.data?.feedback) return;
        setState((prev) =>
          prev
            ? {
                ...prev,
                conversations: json.data?.conversations?.length
                  ? json.data.conversations
                  : prev.conversations,
                feedback: json.data?.feedback?.length ? json.data.feedback : prev.feedback,
              }
            : prev
        );
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener("td-chat-platform-change", onChange);
    return () => window.removeEventListener("td-chat-platform-change", onChange);
  }, [refresh]);

  const website = useMemo(
    () => state?.websites.find((w) => w.id === websiteId) ?? state?.websites[0],
    [state, websiteId]
  );

  if (!state || !website) {
    return (
      <PageMain>
        <p className="text-sm text-stone-500">Loading chat platform…</p>
      </PageMain>
    );
  }

  const analytics = getAnalyticsSnapshot();
  const keys = listWidgetKeys(website.id);
  const domains = listAllowedDomains(website.id);

  return (
    <PageMain>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            AI & Chat · Website Platform
          </p>
          <p className="mt-1 text-sm text-stone-600">
            Configure, embed, and deploy the widget in offline/manual mode. AI conversations not enabled yet.
          </p>
        </div>
        <div className="w-full max-w-xs">
          <Label>Active website</Label>
          <Select
            className="mt-1.5"
            value={website.id}
            onChange={(e) => setWebsiteId(e.target.value)}
          >
            {state.websites.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.aiMode})
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5 border-b border-stone-200 pb-3">
        {CHAT_PLATFORM_SECTIONS.map((s) => (
          <Link
            key={s.id}
            href={s.href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              section === s.id
                ? "bg-amber-500/15 text-amber-800"
                : "text-stone-600 hover:bg-stone-100"
            )}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {section === "dashboard" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Websites", analytics.websites],
            ["Active keys", analytics.activeKeys],
            ["Conversations", analytics.conversations],
            ["Embeds generated", analytics.embedsGenerated],
            ["Offline sites", analytics.offlineModeSites],
            ["Feedback avg", analytics.feedbackAvg?.toFixed(1) ?? "—"],
          ].map(([label, value]) => (
            <Card key={label as string}>
              <CardHeader>
                <CardDescription>{label as string}</CardDescription>
                <CardTitle className="text-2xl">{value as string | number}</CardTitle>
              </CardHeader>
            </Card>
          ))}
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">Quick start</CardTitle>
              <CardDescription>
                1) Create an API key · 2) Add allowed domains · 3) Copy embed from Embed tab · 4) Test offline widget
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Link href="/ai-chat/api-keys">
                <Button type="button">API Keys</Button>
              </Link>
              <Link href="/ai-chat/embed">
                <Button type="button" variant="outline">
                  Embed
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {section === "widget" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Widget Settings</CardTitle>
            <CardDescription>Enable website widget and AI mode (offline until Intelligence wired).</CardDescription>
          </CardHeader>
          <CardContent className="mx-auto max-w-xl space-y-4">
            <div>
              <Label>Website name</Label>
              <Input
                className="mt-1.5"
                value={website.name}
                onChange={(e) => updateWebsite(website.id, { name: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-stone-100 px-3 py-2">
              <span className="text-sm">Widget enabled</span>
              <Toggle
                checked={website.enabled}
                onChange={(v) => updateWebsite(website.id, { enabled: v })}
              />
            </div>
            <div>
              <Label>AI mode</Label>
              <Select
                className="mt-1.5"
                value={website.aiMode}
                onChange={(e) =>
                  updateWebsite(website.id, {
                    aiMode: e.target.value as "offline" | "ai" | "disabled",
                  })
                }
              >
                <option value="offline">Offline (leave a message)</option>
                <option value="ai">AI (Travel Assistant)</option>
                <option value="disabled">Disabled</option>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-stone-100 px-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-800">Collect visitor details</p>
                <p className="mt-0.5 text-xs text-stone-500">
                  On: ask for Email, Name, then Description. Off: start chat with Description only.
                </p>
              </div>
              <Toggle
                checked={website.behaviour.collectVisitorDetails}
                onChange={(v) =>
                  updateBehaviour(website.id, {
                    ...website.behaviour,
                    collectVisitorDetails: v,
                  })
                }
              />
            </div>
            <Button type="button" onClick={() => { refresh(); show("Widget settings saved"); }}>
              Save
            </Button>
          </CardContent>
        </Card>
      )}

      {section === "appearance" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appearance</CardTitle>
          </CardHeader>
          <CardContent className="mx-auto grid max-w-2xl gap-4 sm:grid-cols-2">
            {(
              [
                ["primaryColor", "Primary color"],
                ["accentColor", "Accent color"],
                ["launcherLabel", "Launcher label"],
                ["welcomeTitle", "Welcome title"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <Label>{label}</Label>
                <Input
                  className="mt-1.5"
                  value={website.appearance[key]}
                  onChange={(e) =>
                    updateAppearance(website.id, {
                      ...website.appearance,
                      [key]: e.target.value,
                    })
                  }
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <Label>Welcome body</Label>
              <Textarea
                className="mt-1.5"
                rows={3}
                value={website.appearance.welcomeBody}
                onChange={(e) =>
                  updateAppearance(website.id, {
                    ...website.appearance,
                    welcomeBody: e.target.value,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-stone-100 px-3 py-2 sm:col-span-2">
              <span className="text-sm">Show Travel Days branding</span>
              <Toggle
                checked={website.appearance.showBranding}
                onChange={(v) =>
                  updateAppearance(website.id, { ...website.appearance, showBranding: v })
                }
              />
            </div>
            <Button type="button" onClick={() => show("Appearance saved")}>
              Save appearance
            </Button>
          </CardContent>
        </Card>
      )}

      {section === "behaviour" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Behaviour</CardTitle>
          </CardHeader>
          <CardContent className="mx-auto max-w-xl space-y-3">
            {(
              [
                ["autoOpen", "Auto-open"],
                ["greetOnFirstVisit", "Greet on first visit"],
                ["collectVisitorDetails", "Collect visitor details (name / email)"],
                ["collectEmail", "Collect email"],
                ["collectPhone", "Collect phone"],
                ["enableTypingIndicator", "Typing indicator"],
              ] as const
            ).map(([key, label]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-lg border border-stone-100 px-3 py-2"
              >
                <span className="text-sm">{label}</span>
                <Toggle
                  checked={website.behaviour[key]}
                  onChange={(v) =>
                    updateBehaviour(website.id, { ...website.behaviour, [key]: v })
                  }
                />
              </div>
            ))}
            <div>
              <Label>Offline confirmation message</Label>
              <Textarea
                className="mt-1.5"
                rows={2}
                value={website.behaviour.offlineMessage}
                onChange={(e) =>
                  updateBehaviour(website.id, {
                    ...website.behaviour,
                    offlineMessage: e.target.value,
                  })
                }
              />
            </div>
            <Button type="button" onClick={() => show("Behaviour saved")}>
              Save behaviour
            </Button>
          </CardContent>
        </Card>
      )}

      {section === "api-keys" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generate secure Widget Key</CardTitle>
              <CardDescription>
                Keys are shown once. Syncs to server for embed validation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                onClick={async () => {
                  const { key, secret } = await createWidgetKey({
                    websiteId: website.id,
                    label: `Key ${new Date().toLocaleDateString()}`,
                  });
                  setCreatedSecret(secret);
                  setEmbedKey(secret);
                  refresh();
                  show(`Created ${key.secretHint}`);
                }}
              >
                <Plus className="h-4 w-4" />
                Create widget key
              </Button>
              {createdSecret && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium text-amber-800">
                    Copy now — full secret will not be shown again
                  </p>
                  <CopyBlock title="Widget API Key" code={createdSecret} />
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Keys for {website.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {keys.length === 0 && (
                <p className="text-sm text-stone-500">No keys yet.</p>
              )}
              {keys.map((k: WidgetApiKey) => (
                <div
                  key={k.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-100 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{k.label}</p>
                    <p className="font-mono text-xs text-stone-500">{k.secretHint}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {k.revokedAt ? (
                      <Badge variant="danger">Revoked</Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                    {!k.revokedAt && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          revokeWidgetKey(k.id);
                          refresh();
                          show("Key revoked");
                        }}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {section === "embed" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Embed generators</CardTitle>
              <CardDescription>
                Paste a widget key, then one-click copy Script / React / Next.js / Iframe / API.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Widget key (full secret)</Label>
                <Input
                  className="mt-1.5 font-mono text-xs"
                  placeholder="tdw_live_…"
                  value={embedKey}
                  onChange={(e) => setEmbedKey(e.target.value)}
                />
              </div>
              <Button
                type="button"
                disabled={!embedKey.trim()}
                onClick={() => {
                  setSnippets(buildEmbedSnippets({ widgetKey: embedKey.trim(), websiteId: website.id }));
                  show("Embed snippets ready");
                }}
              >
                Generate embeds
              </Button>
            </CardContent>
          </Card>
          {snippets.map((s) => (
            <CopyBlock key={s.format} title={s.label} code={s.code} />
          ))}
        </div>
      )}

      {section === "domains" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Allowed Domains</CardTitle>
            <CardDescription>Multi-website ready — restrict where embed keys may run.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const origin = String(fd.get("origin") || "");
                addAllowedDomain({ websiteId: website.id, origin, enabled: true });
                e.currentTarget.reset();
                refresh();
                show("Domain added");
              }}
            >
              <Input
                name="origin"
                required
                placeholder="https://www.example.com"
                className="min-w-[240px] flex-1"
              />
              <Button type="submit">Add domain</Button>
            </form>
            {domains.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-lg border border-stone-100 px-3 py-2 text-sm"
              >
                <span className="font-mono text-xs">{d.origin}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    removeAllowedDomain(d.id);
                    refresh();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {section === "knowledge-scope" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Knowledge Scope</CardTitle>
            <CardDescription>
              Applied when AI is enabled later — stored now for zero architecture change.
            </CardDescription>
          </CardHeader>
          <CardContent className="mx-auto max-w-xl space-y-3">
            {(
              [
                ["includePackages", "Packages"],
                ["includeDestinations", "Destinations"],
                ["includeFaqs", "FAQs"],
                ["includeBlogs", "Blogs"],
              ] as const
            ).map(([key, label]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-lg border border-stone-100 px-3 py-2"
              >
                <span className="text-sm">{label}</span>
                <Toggle
                  checked={website.knowledgeScope[key]}
                  onChange={(v) =>
                    updateKnowledgeScope(website.id, {
                      ...website.knowledgeScope,
                      [key]: v,
                    })
                  }
                />
              </div>
            ))}
            <div>
              <Label>Region codes (comma-separated — e.g. rajasthan)</Label>
              <Input
                className="mt-1.5"
                placeholder="IN-RJ  (or rajasthan)"
                value={website.knowledgeScope.regionCodes.join(", ")}
                onChange={(e) =>
                  updateKnowledgeScope(website.id, {
                    ...website.knowledgeScope,
                    regionCodes: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
              <p className="mt-1 text-xs text-stone-500">
                Use <code className="text-[11px]">IN-RJ</code> or <code className="text-[11px]">rajasthan</code>.
                Leave empty to search all regions. City package titles (Jaipur, Udaipur…) are auto-expanded from
                “Rajasthan” queries.
              </p>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                className="mt-1.5"
                rows={2}
                value={website.knowledgeScope.notes}
                onChange={(e) =>
                  updateKnowledgeScope(website.id, {
                    ...website.knowledgeScope,
                    notes: e.target.value,
                  })
                }
              />
            </div>
            <Button type="button" onClick={() => show("Knowledge scope saved")}>
              Save scope
            </Button>
          </CardContent>
        </Card>
      )}

      {section === "providers" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Providers</CardTitle>
            <CardDescription>
              Configuration only — no provider calls until AI conversations are approved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {state.providers.map((p, idx) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-100 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{p.label}</p>
                  <p className="text-xs text-stone-500">
                    {p.envKeyHint ? `Env: ${p.envKeyHint}` : "No secret"} · priority {p.priority}
                  </p>
                </div>
                <Toggle
                  checked={p.enabled}
                  onChange={(v) => {
                    const next = [...state.providers];
                    next[idx] = { ...p, enabled: v };
                    updateProviders(next);
                    refresh();
                  }}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {section === "prompts" && (
        <div className="space-y-4">
          {state.prompts.map((prompt) => (
            <Card key={prompt.id}>
              <CardHeader>
                <CardTitle className="text-base">{prompt.name}</CardTitle>
                <CardDescription>Surface: {prompt.surface}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  rows={5}
                  value={prompt.systemPrompt}
                  onChange={(e) =>
                    updatePrompt({ ...prompt, systemPrompt: e.target.value })
                  }
                />
                <Button type="button" onClick={() => { refresh(); show("Prompt saved"); }}>
                  Save prompt
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {section === "analytics" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Analytics</CardTitle>
            <CardDescription>Management metrics — conversation AI analytics later.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-stone-50 p-4">
              <p className="text-xs text-stone-500">Conversations</p>
              <p className="text-xl font-semibold">{analytics.conversations}</p>
            </div>
            <div className="rounded-lg bg-stone-50 p-4">
              <p className="text-xs text-stone-500">Active keys</p>
              <p className="text-xl font-semibold">{analytics.activeKeys}</p>
            </div>
            <div className="rounded-lg bg-stone-50 p-4">
              <p className="text-xs text-stone-500">Embeds generated</p>
              <p className="text-xl font-semibold">{analytics.embedsGenerated}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {section === "conversations" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversations</CardTitle>
            <CardDescription>
              Offline/manual leave-a-message inbox. AI threads will appear here later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {state.conversations.length === 0 && (
              <p className="text-sm text-stone-500">No conversations yet — try the offline embed.</p>
            )}
            {state.conversations.map((c) => (
              <div key={c.id} className="rounded-lg border border-stone-100 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{c.visitorLabel}</span>
                  <Badge variant="info">{c.status}</Badge>
                  <Badge>{c.channel}</Badge>
                </div>
                <p className="mt-1 text-xs text-stone-500">{c.lastMessagePreview}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {section === "feedback" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {state.feedback.length === 0 && (
              <p className="text-sm text-stone-500">No feedback yet.</p>
            )}
            {state.feedback.map((f) => (
              <div key={f.id} className="rounded-lg border border-stone-100 px-3 py-2 text-sm">
                <p className="font-medium">Rating {f.rating}/5</p>
                <p className="text-xs text-stone-500">{f.comment || "—"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {section === "settings" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Platform Settings</CardTitle>
          </CardHeader>
          <CardContent className="mx-auto max-w-xl space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-stone-100 px-3 py-2">
              <span className="text-sm">Require allowed domains</span>
              <Toggle
                checked={state.settings.requireAllowedDomain}
                onChange={(v) => updatePlatformSettings({ requireAllowedDomain: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-stone-100 px-3 py-2">
              <span className="text-sm">Allow iframe embed</span>
              <Toggle
                checked={state.settings.allowIframeEmbed}
                onChange={(v) => updatePlatformSettings({ allowIframeEmbed: v })}
              />
            </div>
            <div>
              <Label>Public API base URL (optional)</Label>
              <Input
                className="mt-1.5"
                placeholder="https://admin.yourdomain.com"
                value={state.settings.publicApiBaseUrl ?? ""}
                onChange={(e) =>
                  updatePlatformSettings({
                    publicApiBaseUrl: e.target.value || null,
                  })
                }
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                createWebsite({ name: `Website ${state.websites.length + 1}` });
                refresh();
                show("Website added (multi-site ready)");
              }}
            >
              <Plus className="h-4 w-4" />
              Add website
            </Button>
            <Button type="button" onClick={() => { refresh(); show("Settings saved"); }}>
              Save settings
            </Button>
          </CardContent>
        </Card>
      )}
    </PageMain>
  );
}
