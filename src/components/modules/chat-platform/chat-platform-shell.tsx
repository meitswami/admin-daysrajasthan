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
  type ChatHandoffMode,
  type AiProviderSlot,
  type ChatPlatformState,
  type EmbedSnippet,
  type WidgetApiKey,
} from "@/modules/chat";
import { getCurrentTeamMember, listTeamMembers } from "@/lib/rbac/current-user";
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
  const [selectedConversationId, setSelectedConversationId] = useState<string>("");
  const [assignMemberId, setAssignMemberId] = useState("tm-vandana");
  const [agentReply, setAgentReply] = useState("");
  const team = useMemo(() => listTeamMembers().filter((m) => m.is_active), []);
  const me = useMemo(() => getCurrentTeamMember(), []);

  const refresh = useCallback(() => {
    const next = getChatPlatformState();
    setState(next);
    const def = getDefaultWebsite();
    setWebsiteId((prev) => prev || def?.id || next.websites[0]?.id || "");
    void fetch("/api/chat/platform/sync")
      .then(async (res) => {
        const json = (await res.json()) as {
          data?: {
            conversations?: ChatPlatformState["conversations"];
            feedback?: ChatPlatformState["feedback"];
            messages?: ChatPlatformState["messages"];
            sessions?: ChatPlatformState["sessions"];
            settings?: ChatPlatformState["settings"];
          };
        };
        if (!json.data) return;
        setState((prev) =>
          prev
            ? {
                ...prev,
                conversations: json.data?.conversations?.length
                  ? json.data.conversations
                  : prev.conversations,
                feedback: json.data?.feedback?.length ? json.data.feedback : prev.feedback,
                messages: json.data?.messages?.length ? json.data.messages : prev.messages,
                sessions: json.data?.sessions?.length ? json.data.sessions : prev.sessions,
                settings: json.data?.settings
                  ? { ...prev.settings, ...json.data.settings }
                  : prev.settings,
              }
            : prev
        );
      })
      .catch(() => undefined);

    void fetch("/api/chat/platform/providers")
      .then(async (res) => {
        const json = (await res.json()) as {
          data?: { providers?: ChatPlatformState["providers"] };
        };
        if (!json.data?.providers?.length) return;
        setState((prev) => (prev ? { ...prev, providers: json.data!.providers! } : prev));
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
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Providers</CardTitle>
              <CardDescription>
                Priority failover: GitHub Models → Groq → Local → Mock. Enter API keys here — they are
                stored server-side and never shown again (masked only). Enable + Save activates
                immediately (no restart).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Current active provider: </span>
                <span className="font-mono text-amber-800">
                  {state.providers.find((p) => p.status === "ready" && p.enabled)?.label ??
                    state.providers.find((p) => p.enabled)?.label ??
                    "None"}
                </span>
              </p>
            </CardContent>
          </Card>

          {state.providers
            .slice()
            .sort((a, b) => a.priority - b.priority)
            .map((p) => (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{p.label}</CardTitle>
                      <CardDescription>
                        {p.providerId}
                        {p.envKeyHint ? ` · env fallback: ${p.envKeyHint}` : ""}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          !p.enabled
                            ? "default"
                            : p.status === "ready"
                              ? "success"
                              : p.status === "error"
                                ? "danger"
                                : "warning"
                        }
                      >
                        {!p.enabled
                          ? "disabled"
                          : p.status === "disabled"
                            ? "idle"
                            : (p.status ?? "idle")}
                      </Badge>
                      <Toggle
                        checked={p.enabled}
                        onChange={(v) => {
                          const next = state.providers.map((x) =>
                            x.id === p.id
                              ? {
                                  ...x,
                                  enabled: v,
                                  status: (v
                                    ? x.status === "disabled"
                                      ? "idle"
                                      : (x.status ?? "idle")
                                    : "disabled") as AiProviderSlot["status"],
                                }
                              : x
                          );
                          setState({ ...state, providers: next });
                        }}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Priority (0 = primary)</Label>
                    <Input
                      className="mt-1.5"
                      type="number"
                      min={0}
                      max={99}
                      value={p.priority}
                      onChange={(e) => {
                        const priority = Number(e.target.value) || 0;
                        const next = state.providers.map((x) =>
                          x.id === p.id ? { ...x, priority } : x
                        );
                        setState({ ...state, providers: next });
                      }}
                    />
                  </div>
                  {(p.providerId === "github-models" ||
                    p.providerId === "groq" ||
                    p.providerId === "huggingface" ||
                    p.providerId === "openrouter") && (
                    <div>
                      <Label>Model</Label>
                      <Input
                        className="mt-1.5 font-mono text-xs"
                        value={p.modelId ?? ""}
                        placeholder={
                          p.providerId === "github-models"
                            ? "mistral-ai/mistral-small-2503"
                            : p.providerId === "groq"
                              ? "llama-3.1-8b-instant"
                              : p.providerId === "huggingface"
                                ? "Qwen/Qwen2.5-3B-Instruct:featherless-ai"
                                : "model-id"
                        }
                        onChange={(e) => {
                          const next = state.providers.map((x) =>
                            x.id === p.id ? { ...x, modelId: e.target.value } : x
                          );
                          setState({ ...state, providers: next });
                        }}
                      />
                      {p.providerId === "huggingface" && (
                        <p className="mt-1 text-[11px] text-stone-500">
                          Include the inference provider suffix, e.g.{" "}
                          <code className="text-[11px]">:featherless-ai</code> (HF model card →
                          Featherless AI). Bare ids fail with model_not_supported.
                        </p>
                      )}
                    </div>
                  )}
                  {(p.providerId === "github-models" ||
                    p.providerId === "groq" ||
                    p.providerId === "huggingface" ||
                    p.providerId === "openrouter") && (
                    <div className="sm:col-span-2">
                      <Label>API Key</Label>
                      <Input
                        className="mt-1.5 font-mono text-xs"
                        type="password"
                        autoComplete="off"
                        placeholder={
                          p.apiKeyMasked
                            ? `Saved: ${p.apiKeyMasked} — paste new key to replace`
                            : "Paste API key (shown once as masked after save)"
                        }
                        id={`key_${p.id}`}
                        onChange={() => undefined}
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={async () => {
                            const el = document.getElementById(`key_${p.id}`) as HTMLInputElement | null;
                            const raw = el?.value?.trim() ?? "";
                            if (!raw) {
                              show("Paste a key first");
                              return;
                            }
                            const res = await fetch("/api/chat/platform/providers", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                action: "save_key",
                                providerId: p.providerId,
                                apiKey: raw,
                              }),
                            });
                            const json = (await res.json()) as {
                              success?: boolean;
                              message?: string;
                              data?: { apiKeyMasked?: string };
                            };
                            if (!json.success) {
                              show(json.message ?? "Key save failed");
                              return;
                            }
                            if (el) el.value = "";
                            const next = state.providers.map((x) =>
                              x.id === p.id
                                ? {
                                    ...x,
                                    apiKeyMasked: json.data?.apiKeyMasked ?? "****",
                                    hasApiKey: true,
                                  }
                                : x
                            );
                            updateProviders(next);
                            setState({ ...state, providers: next });
                            show("API key saved (masked)");
                          }}
                        >
                          Save key
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const res = await fetch("/api/chat/platform/providers", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                action: "clear_key",
                                providerId: p.providerId,
                              }),
                            });
                            const json = (await res.json()) as { success?: boolean; message?: string };
                            if (!json.success) {
                              show(json.message ?? "Clear failed");
                              return;
                            }
                            const next = state.providers.map((x) =>
                              x.id === p.id
                                ? { ...x, apiKeyMasked: null, hasApiKey: false, status: "untested" as const }
                                : x
                            );
                            updateProviders(next);
                            setState({ ...state, providers: next });
                            show("API key cleared");
                          }}
                        >
                          Clear key
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            // Persist config first so model/enable apply
                            await fetch("/api/chat/platform/providers", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                action: "save_config",
                                providers: state.providers.map((x) => ({
                                  id: x.id,
                                  providerId: x.providerId,
                                  label: x.label,
                                  enabled: x.enabled,
                                  envKeyHint: x.envKeyHint,
                                  priority: x.priority,
                                  modelId: x.modelId ?? null,
                                })),
                              }),
                            });
                            const res = await fetch("/api/chat/platform/providers", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                action: "test",
                                providerId: p.providerId,
                              }),
                            });
                            const json = (await res.json()) as {
                              success?: boolean;
                              message?: string;
                              data?: { providers?: typeof state.providers; latencyMs?: number };
                            };
                            if (json.data?.providers) {
                              updateProviders(json.data.providers);
                              setState({ ...state, providers: json.data.providers });
                            }
                            show(
                              json.success
                                ? `${json.message}${json.data?.latencyMs != null ? ` (${json.data.latencyMs}ms)` : ""}`
                                : json.message ?? "Test failed"
                            );
                          }}
                        >
                          Test Connection
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="sm:col-span-2 grid gap-1 text-xs text-stone-500">
                    <p>Last success: {p.lastSuccessAt ? new Date(p.lastSuccessAt).toLocaleString() : "—"}</p>
                    <p>Last tested: {p.lastTestedAt ? new Date(p.lastTestedAt).toLocaleString() : "—"}</p>
                    {p.lastError && <p className="text-red-600">Last error: {p.lastError}</p>}
                  </div>
                </CardContent>
              </Card>
            ))}

          <Button
            type="button"
            onClick={async () => {
              const res = await fetch("/api/chat/platform/providers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "save_config",
                  providers: state.providers.map((x) => ({
                    id: x.id,
                    providerId: x.providerId,
                    label: x.label,
                    enabled: x.enabled,
                    envKeyHint: x.envKeyHint,
                    priority: x.priority,
                    modelId: x.modelId ?? null,
                  })),
                }),
              });
              const json = (await res.json()) as {
                success?: boolean;
                message?: string;
                data?: { providers?: typeof state.providers; activeProviderId?: string };
              };
              if (!json.success) {
                show(json.message ?? "Save failed");
                return;
              }
              if (json.data?.providers) {
                updateProviders(json.data.providers);
                setState({ ...state, providers: json.data.providers });
              } else {
                updateProviders(state.providers);
              }
              show(json.message ?? "Providers saved — active immediately");
            }}
          >
            Save provider settings
          </Button>
        </div>
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
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Superadmin query inbox</CardTitle>
              <CardDescription>
                Every visitor query is saved here. Assign to a human agent or take over the chat.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {state.conversations.length === 0 && (
                <p className="text-sm text-stone-500">No conversations yet — try the widget.</p>
              )}
              {state.conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedConversationId(c.id);
                    setAssignMemberId(c.assignedToTeamMemberId || "tm-vandana");
                  }}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-left text-sm transition",
                    selectedConversationId === c.id
                      ? "border-amber-300 bg-amber-50"
                      : "border-stone-100 hover:bg-stone-50"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{c.visitorLabel}</span>
                    <Badge variant="info">{c.status}</Badge>
                    <Badge>{c.channel}</Badge>
                    {c.handoffStatus && <Badge variant="success">{c.handoffStatus}</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-stone-500">{c.lastMessagePreview}</p>
                  {c.assignedToName && (
                    <p className="mt-1 text-[11px] text-amber-800">Assigned: {c.assignedToName}</p>
                  )}
                  {(c.queries?.length ?? 0) > 0 && (
                    <p className="mt-1 text-[11px] text-stone-400">{c.queries!.length} queries saved</p>
                  )}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thread & assignment</CardTitle>
              <CardDescription>
                Assign leads to a team member, or reply as a human agent (AI pauses after takeover).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const selected =
                  state.conversations.find((c) => c.id === selectedConversationId) ??
                  state.conversations[0];
                if (!selected) {
                  return <p className="text-sm text-stone-500">Select a conversation.</p>;
                }
                const thread = state.messages
                  .filter((m) => m.sessionId === selected.sessionId)
                  .slice()
                  .reverse();
                return (
                  <>
                    <div className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-sm">
                      <p className="font-medium">{selected.visitorLabel}</p>
                      <p className="text-xs text-stone-500">
                        {selected.email || "No email"} · {selected.handoffStatus || "ai"}
                      </p>
                    </div>

                    {(selected.queries?.length ?? 0) > 0 && (
                      <div>
                        <Label>Saved queries</Label>
                        <ul className="mt-1.5 space-y-1 text-sm text-stone-700">
                          {selected.queries!.map((q, i) => (
                            <li key={`${selected.id}_q_${i}`} className="rounded bg-white px-2 py-1 border border-stone-100">
                              {q}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-stone-100 p-3">
                      {thread.length === 0 && (
                        <p className="text-xs text-stone-500">No messages in thread yet.</p>
                      )}
                      {thread.map((m) => (
                        <div
                          key={m.id}
                          className={cn(
                            "rounded-lg px-3 py-2 text-sm",
                            m.role === "user" ? "bg-[#7A1F1F] text-white ml-6" : "bg-stone-100 mr-6"
                          )}
                        >
                          <p className="whitespace-pre-wrap">{m.text}</p>
                          <p className="mt-1 text-[10px] opacity-70">
                            {m.role}
                            {m.provider ? ` · ${m.provider}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-end gap-2">
                      <div className="min-w-[180px] flex-1">
                        <Label>Assign to team member</Label>
                        <Select
                          className="mt-1.5"
                          value={assignMemberId}
                          onChange={(e) => setAssignMemberId(e.target.value)}
                        >
                          {team.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.role})
                            </option>
                          ))}
                        </Select>
                      </div>
                      <Button
                        type="button"
                        onClick={async () => {
                          const res = await fetch("/api/chat/platform/handoff", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "assign",
                              conversationId: selected.id,
                              teamMemberId: assignMemberId,
                              assignedBy: me.name,
                              takeOver: true,
                            }),
                          });
                          const json = (await res.json()) as { success?: boolean; message?: string };
                          if (!json.success) {
                            show(json.message ?? "Assign failed");
                            return;
                          }
                          show(json.message ?? "Assigned");
                          refresh();
                        }}
                      >
                        Assign & take over
                      </Button>
                    </div>

                    <div>
                      <Label>Human agent reply</Label>
                      <Textarea
                        className="mt-1.5"
                        rows={3}
                        placeholder="Type a reply to the client…"
                        value={agentReply}
                        onChange={(e) => setAgentReply(e.target.value)}
                      />
                      <Button
                        type="button"
                        className="mt-2"
                        disabled={!agentReply.trim() || !selected.sessionId}
                        onClick={async () => {
                          if (!selected.sessionId) return;
                          const res = await fetch("/api/chat/platform/handoff", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "agent_reply",
                              sessionId: selected.sessionId,
                              text: agentReply.trim(),
                              agentName: me.name,
                            }),
                          });
                          const json = (await res.json()) as { success?: boolean; message?: string };
                          if (!json.success) {
                            show(json.message ?? "Reply failed");
                            return;
                          }
                          setAgentReply("");
                          show("Reply sent");
                          refresh();
                        }}
                      >
                        Send as agent
                      </Button>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </div>
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
            <div className="flex items-center justify-between rounded-lg border border-stone-100 px-3 py-3">
              <div className="min-w-0 pr-3">
                <p className="text-sm font-medium">Save all queries to Superadmin</p>
                <p className="mt-0.5 text-xs text-stone-500">
                  Every visitor question is stored in Conversations for Superadmin review.
                </p>
              </div>
              <Toggle
                checked={state.settings.saveQueriesToSuperadmin !== false}
                onChange={(v) => updatePlatformSettings({ saveQueriesToSuperadmin: v })}
              />
            </div>

            <div className="rounded-lg border border-stone-100 p-3 space-y-3">
              <div>
                <p className="text-sm font-medium">Human handoff mode</p>
                <p className="mt-0.5 text-xs text-stone-500">
                  Choose how chat leads reach your team.
                </p>
              </div>
              <div className="grid gap-2">
                <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-stone-100 px-3 py-2">
                  <input
                    type="radio"
                    className="mt-1"
                    name="handoffMode"
                    checked={state.settings.handoffMode === "auto_human"}
                    onChange={() =>
                      updatePlatformSettings({ handoffMode: "auto_human" as ChatHandoffMode })
                    }
                  />
                  <span>
                    <span className="block text-sm font-medium">Auto-assign to human agent</span>
                    <span className="block text-xs text-stone-500">
                      New chats go to the default agent so they can take over live.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-stone-100 px-3 py-2">
                  <input
                    type="radio"
                    className="mt-1"
                    name="handoffMode"
                    checked={(state.settings.handoffMode ?? "admin_assign") === "admin_assign"}
                    onChange={() =>
                      updatePlatformSettings({ handoffMode: "admin_assign" as ChatHandoffMode })
                    }
                  />
                  <span>
                    <span className="block text-sm font-medium">Admin assigns to team member</span>
                    <span className="block text-xs text-stone-500">
                      Queue for Superadmin — pick a specific teammate from Conversations.
                    </span>
                  </span>
                </label>
              </div>
              {state.settings.handoffMode === "auto_human" && (
                <div className="space-y-3">
                  <div>
                    <Label>Default agent</Label>
                    <Select
                      className="mt-1.5"
                      value={state.settings.defaultAgentTeamMemberId ?? "tm-vandana"}
                      onChange={(e) =>
                        updatePlatformSettings({ defaultAgentTeamMemberId: e.target.value })
                      }
                    >
                      {team.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.role})
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Accept countdown (seconds)</Label>
                    <Input
                      className="mt-1.5"
                      type="number"
                      min={5}
                      max={120}
                      value={state.settings.leadAcceptSeconds ?? 20}
                      onChange={(e) =>
                        updatePlatformSettings({
                          leadAcceptSeconds: Math.max(
                            5,
                            Math.min(120, Number(e.target.value) || 20)
                          ),
                        })
                      }
                    />
                    <p className="mt-1 text-xs text-stone-500">
                      If the agent does not Accept in time, the lead rotates to the next Online agent.
                      If nobody is online, it becomes floating for any active teammate to Claim — and
                      Admin gets an alert sound + SWAL.
                    </p>
                  </div>
                </div>
              )}
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
