"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { FileUploadField } from "@/components/ui/file-upload-field";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageMain } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { useSiteSettings } from "@/components/providers/site-settings-provider";
import { useToast } from "@/components/ui/toast";
import { crmSyncLogs } from "@/lib/data/mock-data";
import { formatDateTime } from "@/lib/utils";
import type { AdminSettingsTab, SmtpSecure } from "@/types/site-settings";
import { cn } from "@/lib/utils";
import { CheckCircle2, Database, Loader2, Mail, Settings2, Zap, Wrench, Shield } from "lucide-react";
import { SystemSettingsPanel } from "@/components/settings/system-settings-panel";

export function SettingsView() {
  const { settings, updateAdminGeneral, updateSmtp } = useSiteSettings();
  const { show } = useToast();
  const [tab, setTab] = useState<AdminSettingsTab>("general");
  const [draftAdmin, setDraftAdmin] = useState(settings.adminGeneral);
  const [draftSmtp, setDraftSmtp] = useState(settings.smtp);
  const [webhookUrl, setWebhookUrl] = useState("https://crm.traveldays.in/api/webhooks/leads");
  const [testing, setTesting] = useState(false);
  const [logs, setLogs] = useState(crmSyncLogs);

  useEffect(() => {
    setDraftAdmin(settings.adminGeneral);
  }, [settings.adminGeneral]);

  useEffect(() => {
    setDraftSmtp(settings.smtp);
  }, [settings.smtp]);

  const tabs: { id: AdminSettingsTab; label: string; icon: typeof Wrench }[] = [
    { id: "general", label: "General Settings", icon: Wrench },
    { id: "smtp", label: "SMTP Settings", icon: Mail },
    { id: "integration", label: "CRM & APIs", icon: Settings2 },
    { id: "system", label: "System & RBAC", icon: Shield },
  ];

  function saveGeneral(e: React.FormEvent) {
    e.preventDefault();
    updateAdminGeneral(draftAdmin);
    show("Admin settings saved");
  }

  function saveSmtp(e: React.FormEvent) {
    e.preventDefault();
    updateSmtp(draftSmtp);
    void fetch("/api/settings/smtp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        smtp: draftSmtp,
        fromName: settings.adminGeneral.author || settings.webGeneral.site_name,
      }),
    });
    show("SMTP settings saved");
  }

  async function handleCrmTest() {
    setTesting(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLogs((prev) => [
      {
        id: crypto.randomUUID(),
        entity_type: "inquiry" as const,
        entity_id: "44444444-4444-4444-4444-444444444001",
        status: "success" as const,
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);
    setTesting(false);
    show("CRM webhook test successful (demo)");
  }

  return (
    <PageMain>
      <Card className="border-amber-200/60 bg-amber-50/40">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
          <Database className="h-8 w-8 shrink-0 text-amber-700" />
          <div className="flex-1">
            <p className="font-semibold text-stone-900">Demo mode — settings persist in browser</p>
            <p className="text-sm text-stone-600">
              {settings.webGeneral.site_name} ({settings.webGeneral.site_short_name}) — changes apply across admin until Supabase connects.
            </p>
          </div>
          <Badge variant="warning">Mock data</Badge>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                tab === t.id ? "border-b-2 border-amber-500 text-amber-700" : "text-stone-600 hover:bg-stone-100"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "general" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Admin General Settings</CardTitle>
            <CardDescription>Panel branding, contact & social links for {settings.webGeneral.site_short_name}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveGeneral} className="mx-auto max-w-3xl space-y-5">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  required
                  type="email"
                  className="mt-1.5"
                  value={draftAdmin.email}
                  onChange={(e) => setDraftAdmin({ ...draftAdmin, email: e.target.value })}
                />
                <p className="mt-1 text-xs text-red-600">Used for contact requests & system notifications.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="currency_code">Currency Code</Label>
                  <Input
                    id="currency_code"
                    className="mt-1.5"
                    value={draftAdmin.currency_code}
                    onChange={(e) => setDraftAdmin({ ...draftAdmin, currency_code: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="currency_sign">Currency Sign</Label>
                  <Input
                    id="currency_sign"
                    className="mt-1.5"
                    value={draftAdmin.currency_sign}
                    onChange={(e) => setDraftAdmin({ ...draftAdmin, currency_sign: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="admin_title">Admin Title *</Label>
                <Input
                  id="admin_title"
                  required
                  className="mt-1.5"
                  value={draftAdmin.admin_title}
                  onChange={(e) => setDraftAdmin({ ...draftAdmin, admin_title: e.target.value })}
                />
              </div>
              <FileUploadField
                label="Admin Logo"
                hint="(Recommended: 170×36) Accept png, jpg, jpeg, gif"
                value={draftAdmin.admin_logo_url}
                onChange={(v) => setDraftAdmin({ ...draftAdmin, admin_logo_url: v })}
                previewWide
              />
              <FileUploadField
                label="Admin Favicon"
                hint="(Recommended: 16×16 square)"
                value={draftAdmin.admin_favicon_url}
                onChange={(v) => setDraftAdmin({ ...draftAdmin, admin_favicon_url: v })}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="author">Author</Label>
                  <Input id="author" className="mt-1.5" value={draftAdmin.author} onChange={(e) => setDraftAdmin({ ...draftAdmin, author: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="developed_by">Developed By</Label>
                  <Input id="developed_by" className="mt-1.5" value={draftAdmin.developed_by} onChange={(e) => setDraftAdmin({ ...draftAdmin, developed_by: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" className="mt-1.5" value={draftAdmin.phone} onChange={(e) => setDraftAdmin({ ...draftAdmin, phone: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="website_url">Website URL</Label>
                  <Input id="website_url" className="mt-1.5" value={draftAdmin.website_url} onChange={(e) => setDraftAdmin({ ...draftAdmin, website_url: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="gstin">GSTIN (optional)</Label>
                  <Input
                    id="gstin"
                    className="mt-1.5"
                    placeholder="08AAAAA0000A1Z5"
                    value={draftAdmin.gstin ?? ""}
                    onChange={(e) => setDraftAdmin({ ...draftAdmin, gstin: e.target.value || null })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="report_footer_text">Report / PDF footer</Label>
                <Textarea
                  id="report_footer_text"
                  rows={2}
                  className="mt-1.5"
                  value={draftAdmin.report_footer_text ?? ""}
                  onChange={(e) => setDraftAdmin({ ...draftAdmin, report_footer_text: e.target.value })}
                />
                <p className="mt-1 text-xs text-stone-500">Shown on quotations, proposals, and printable reports.</p>
              </div>
              <div className="border-t border-stone-100 pt-4">
                <p className="mb-3 text-sm font-semibold text-stone-800">Social Media</p>
                <div className="space-y-3">
                  {(
                    [
                      ["facebook_url", "Facebook"],
                      ["twitter_url", "Twitter"],
                      ["youtube_url", "Youtube"],
                      ["instagram_url", "Instagram"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key}>
                      <Label htmlFor={key}>{label}</Label>
                      <Input
                        id={key}
                        className="mt-1.5"
                        value={draftAdmin[key]}
                        onChange={(e) => setDraftAdmin({ ...draftAdmin, [key]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <Button type="submit">Save</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {tab === "smtp" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">SMTP Settings</CardTitle>
            <CardDescription>
              Outbound email for inquiries & notifications. Saved here and synced to Supabase for server delivery.
              You can also set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in .env.local.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveSmtp} className="mx-auto max-w-xl space-y-4">
              <div>
                <Label htmlFor="smtp_host">SMTP Host *</Label>
                <Input id="smtp_host" required className="mt-1.5" placeholder="mail.example.in" value={draftSmtp.host} onChange={(e) => setDraftSmtp({ ...draftSmtp, host: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="smtp_email">Email *</Label>
                <Input id="smtp_email" required type="email" className="mt-1.5" placeholder="info@example.com" value={draftSmtp.email} onChange={(e) => setDraftSmtp({ ...draftSmtp, email: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="smtp_password">Password *</Label>
                <Input id="smtp_password" required type="password" className="mt-1.5" value={draftSmtp.password} onChange={(e) => setDraftSmtp({ ...draftSmtp, password: e.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="smtp_secure">SMTPSecure</Label>
                  <Select id="smtp_secure" className="mt-1.5" value={draftSmtp.secure} onChange={(e) => setDraftSmtp({ ...draftSmtp, secure: e.target.value as SmtpSecure })}>
                    <option value="TLS">TLS</option>
                    <option value="SSL">SSL</option>
                    <option value="None">None</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="smtp_port">Port No. *</Label>
                  <Input id="smtp_port" required className="mt-1.5" placeholder="587" value={draftSmtp.port} onChange={(e) => setDraftSmtp({ ...draftSmtp, port: e.target.value })} />
                </div>
              </div>
              <Button type="submit">Save</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {tab === "system" && <SystemSettingsPanel />}

      {tab === "integration" && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Change Password</CardTitle>
                <CardDescription>Secure your {settings.webGeneral.site_short_name} admin account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); show("Password updated (demo)"); }} className="space-y-4">
                  <div><Label>Current Password</Label><Input type="password" className="mt-1.5" placeholder="••••••••" /></div>
                  <div><Label>New Password</Label><Input type="password" className="mt-1.5" placeholder="••••••••" /></div>
                  <Button type="submit">Update Password</Button>
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">CRM Integration</CardTitle>
                <CardDescription>Travel CRM webhook for {settings.webGeneral.site_name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div><Label>Webhook URL</Label><Input className="mt-1.5" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} /></div>
                <div><Label>Webhook Secret</Label><Input type="password" className="mt-1.5" defaultValue="demo-secret" /></div>
                <div className="grid grid-cols-2 gap-2">
                  {["Contact", "Inquiry", "Download", "WhatsApp"].map((s) => (
                    <div key={s} className="flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      {s}
                    </div>
                  ))}
                </div>
                <Button onClick={handleCrmTest} disabled={testing}>
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  Save & Test Webhook
                </Button>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">CRM sync log</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-stone-500">
                    {["Type", "Entity", "Status", "Time"].map((h) => (
                      <th key={h} className="pb-2 pr-4 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-2.5 capitalize">{log.entity_type}</td>
                      <td className="py-2.5 font-mono text-xs">{log.entity_id.slice(0, 8)}…</td>
                      <td className="py-2.5"><StatusBadge status={log.status} /></td>
                      <td className="py-2.5 whitespace-nowrap text-stone-500">{formatDateTime(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Public website APIs</CardTitle>
              <CardDescription>Endpoints for {settings.webGeneral.site_name} forms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                { method: "GET", path: "/api/public/site-settings", desc: "Dynamic site name, logo, pages & contact", sample: '{ "site_name", "site_short_name", "pages" }' },
                { method: "POST", path: "/api/public/contact", desc: "Contact Us form", sample: '{ "name", "email", "message" }' },
                { method: "POST", path: "/api/public/inquiry", desc: "Package inquiry form", sample: '{ "customer_name", "email", "destination" }' },
                { method: "POST", path: "/api/public/itinerary-download", desc: "PDF download lead", sample: '{ "customer_name", "email", "package_name" }' },
                { method: "POST", path: "/api/public/whatsapp-lead", desc: "WhatsApp click", sample: '{ "phone", "selected_package" }' },
              ].map((api) => (
                <div key={api.path} className="rounded-lg border border-stone-100 bg-stone-50/80 px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="info">{api.method}</Badge>
                    <code className="text-xs">{api.path}</code>
                  </div>
                  <p className="mt-1 text-xs text-stone-500">{api.desc}</p>
                  <p className="mt-1 font-mono text-[11px] text-stone-400">{api.sample}</p>
                </div>
              ))}
              <Link href="/reports" className={buttonVariants({ variant: "outline", size: "sm" })}>
                View export reports →
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
    </PageMain>
  );
}
