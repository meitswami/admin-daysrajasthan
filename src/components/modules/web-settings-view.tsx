"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { FileUploadField } from "@/components/ui/file-upload-field";
import { Toggle } from "@/components/ui/toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageMain } from "@/components/ui/data-table";
import { useSiteSettings } from "@/components/providers/site-settings-provider";
import { useToast } from "@/components/ui/toast";
import type { WebSettingsTab } from "@/types/site-settings";
import { cn } from "@/lib/utils";
import { Globe, FileText, Wrench } from "lucide-react";

export function WebSettingsView() {
  const { settings, updateWebGeneral, updateWebPage, updateAdminGeneral } = useSiteSettings();
  const { show } = useToast();
  const [tab, setTab] = useState<WebSettingsTab>("general");
  const [activePageId, setActivePageId] = useState(settings.webPages[0]?.id ?? "");
  const [draftGeneral, setDraftGeneral] = useState(settings.webGeneral);

  useEffect(() => {
    setDraftGeneral(settings.webGeneral);
  }, [settings.webGeneral]);

  const activePage = useMemo(
    () => settings.webPages.find((p) => p.id === activePageId) ?? settings.webPages[0],
    [settings.webPages, activePageId]
  );

  const [draftPage, setDraftPage] = useState(activePage);

  useEffect(() => {
    if (activePage) setDraftPage(activePage);
  }, [activePage]);

  function saveGeneral(e: React.FormEvent) {
    e.preventDefault();
    updateWebGeneral(draftGeneral);
    updateAdminGeneral({
      admin_title: `${draftGeneral.site_name} — Admin`,
      author: draftGeneral.site_name,
      email: draftGeneral.contact_email || settings.adminGeneral.email,
      phone: draftGeneral.contact_phone || settings.adminGeneral.phone,
      website_url: draftGeneral.website_url || settings.adminGeneral.website_url,
    });
    show("Website general settings saved — branding updated across admin");
  }

  function savePage(e: React.FormEvent) {
    e.preventDefault();
    if (!draftPage) return;
    updateWebPage(draftPage.id, draftPage);
    show(`${draftPage.label} page saved`);
  }

  const tabs: { id: WebSettingsTab; label: string; icon: typeof Wrench }[] = [
    { id: "general", label: "General Settings", icon: Wrench },
    { id: "pages", label: "Page Settings", icon: FileText },
  ];

  return (
    <PageMain>
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
                tab === t.id
                  ? "border-b-2 border-amber-500 text-amber-700"
                  : "text-stone-600 hover:bg-stone-100"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "general" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-5 w-5 text-amber-600" />
              Website General Settings
            </CardTitle>
            <CardDescription>
              Site name & short name are used dynamically across the admin panel and public website.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveGeneral} className="mx-auto max-w-3xl space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="site_name">Site Name *</Label>
                  <Input
                    id="site_name"
                    required
                    className="mt-1.5"
                    value={draftGeneral.site_name}
                    onChange={(e) => setDraftGeneral({ ...draftGeneral, site_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="site_short_name">Site Short Name *</Label>
                  <Input
                    id="site_short_name"
                    required
                    className="mt-1.5"
                    value={draftGeneral.site_short_name}
                    onChange={(e) => setDraftGeneral({ ...draftGeneral, site_short_name: e.target.value })}
                    placeholder="TDR"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="site_description">Site Description *</Label>
                <textarea
                  id="site_description"
                  required
                  rows={3}
                  className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                  value={draftGeneral.site_description}
                  onChange={(e) => setDraftGeneral({ ...draftGeneral, site_description: e.target.value })}
                />
              </div>
              <FileUploadField
                label="Site Logo"
                hint="(Recommended: 170×36) Accept png, jpg, jpeg, gif"
                value={draftGeneral.site_logo_url}
                onChange={(v) => setDraftGeneral({ ...draftGeneral, site_logo_url: v })}
                previewWide
                required
              />
              <FileUploadField
                label="Site Favicon"
                hint="(Recommended: 16×16 square, small file) Accept png, jpg, jpeg, gif, ico"
                value={draftGeneral.site_favicon_url}
                onChange={(v) => setDraftGeneral({ ...draftGeneral, site_favicon_url: v })}
                required
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="contact_email">Contact Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    className="mt-1.5"
                    value={draftGeneral.contact_email}
                    onChange={(e) => setDraftGeneral({ ...draftGeneral, contact_email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input
                    id="contact_phone"
                    className="mt-1.5"
                    value={draftGeneral.contact_phone}
                    onChange={(e) => setDraftGeneral({ ...draftGeneral, contact_phone: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="contact_address">Contact Address</Label>
                <textarea
                  id="contact_address"
                  rows={2}
                  className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                  value={draftGeneral.contact_address}
                  onChange={(e) => setDraftGeneral({ ...draftGeneral, contact_address: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="website_url">Website URL</Label>
                <Input
                  id="website_url"
                  className="mt-1.5"
                  value={draftGeneral.website_url}
                  onChange={(e) => setDraftGeneral({ ...draftGeneral, website_url: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="copyright_html">Copyright Text *</Label>
                <Input
                  id="copyright_html"
                  required
                  className="mt-1.5"
                  value={draftGeneral.copyright_html}
                  onChange={(e) => setDraftGeneral({ ...draftGeneral, copyright_html: e.target.value })}
                />
              </div>
              <Button type="submit">Save</Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <Card className="h-fit lg:sticky lg:top-24">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Pages</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[420px] space-y-1 overflow-y-auto p-2">
              {settings.webPages.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setActivePageId(p.id);
                    setDraftPage(p);
                  }}
                  className={cn(
                    "block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    activePageId === p.id
                      ? "bg-amber-100 font-medium text-amber-900"
                      : "text-stone-600 hover:bg-stone-100"
                  )}
                >
                  {p.slug === "why-us" ? `Why ${settings.webGeneral.site_short_name}?` : p.label}
                </button>
              ))}
            </CardContent>
          </Card>

          {draftPage && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{draftPage.label}</CardTitle>
                <CardDescription>Edit page content shown on the public website</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={savePage} className="space-y-4">
                  <div>
                    <Label htmlFor="page_title">Page Title *</Label>
                    <Input
                      id="page_title"
                      required
                      className="mt-1.5"
                      value={draftPage.title}
                      onChange={(e) => setDraftPage({ ...draftPage, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="page_content">Content</Label>
                    <textarea
                      id="page_content"
                      rows={14}
                      className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2 font-mono text-sm"
                      value={draftPage.content_html}
                      onChange={(e) => setDraftPage({ ...draftPage, content_html: e.target.value })}
                    />
                    <p className="mt-1 text-xs text-stone-500">HTML supported — headings, lists, links.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Toggle
                      checked={draftPage.is_published}
                      onChange={(v) => setDraftPage({ ...draftPage, is_published: v })}
                      label="Page published on website"
                    />
                  </div>
                  <Button type="submit">Save</Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </PageMain>
  );
}
