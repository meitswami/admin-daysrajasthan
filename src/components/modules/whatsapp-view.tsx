"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { DataTable, PageMain, PageToolbar, type Column } from "@/components/ui/data-table";
import { Sheet } from "@/components/ui/sheet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerLinkPanel } from "@/components/shared/customer-link-panel";
import { getCustomerByEmail, getLinkedCustomers } from "@/lib/data/customer-links";
import type { PackageInquiry, WhatsappLead } from "@/types/database";
import { formatDateTime } from "@/lib/utils";
import { MessageCircle, ExternalLink, Search } from "lucide-react";
import { CreateQuoteFromLeadButton } from "@/components/leads/create-quote-from-lead-button";
import type { UnifiedLead } from "@/lib/leads/unified-leads";

function normalizePhone(p: string) {
  return p.replace(/\D/g, "").slice(-10);
}

function whatsappToLead(w: WhatsappLead): UnifiedLead {
  return {
    id: `whatsapp:${w.id}`,
    source: "whatsapp",
    source_id: w.id,
    name: w.customer_name ?? "WhatsApp Lead",
    email: null,
    phone: w.phone,
    destination: w.destination,
    travel_date: null,
    adults: 2,
    children: 0,
    package_hint: w.selected_package,
    notes: w.landing_url,
    status: "new",
    created_at: w.created_at,
    converted_quote_id: null,
  };
}

export function WhatsappView({
  initialData,
  linkedInquiries = [],
}: {
  initialData: WhatsappLead[];
  /** Optional package inquiries for phone matching (from DB). */
  linkedInquiries?: PackageInquiry[];
}) {
  const { show } = useToast();
  const [items, setItems] = useState(initialData);
  const [search, setSearch] = useState("");
  const [detailEmail, setDetailEmail] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return items;
    return items.filter(
      (w) =>
        (w.customer_name?.toLowerCase().includes(q) ?? false) ||
        w.phone.includes(q) ||
        (w.selected_package?.toLowerCase().includes(q) ?? false)
    );
  }, [items, search]);

  const linkedCount = items.filter((w) =>
    linkedInquiries.some((i) => normalizePhone(i.mobile) === normalizePhone(w.phone))
  ).length;

  const linkedCustomers = getLinkedCustomers();

  function syncToCrm(id: string) {
    setItems((prev) => prev.map((w) => (w.id === id ? { ...w, synced_to_crm: true } : w)));
    show("Synced to CRM");
  }

  const columns: Column<WhatsappLead>[] = [
    {
      key: "customer",
      header: "Customer",
      cell: (row) => {
        const inq = linkedInquiries.find(
          (i) => normalizePhone(i.mobile) === normalizePhone(row.phone)
        );
        return (
          <button
            type="button"
            className="text-left"
            onClick={() => inq && setDetailEmail(inq.email)}
          >
            <p className="font-medium text-amber-900 hover:underline">
              {row.customer_name ?? "Unknown"}
            </p>
            <p className="text-xs text-stone-500">{row.phone}</p>
          </button>
        );
      },
    },
    { key: "package", header: "Package", cell: (row) => row.selected_package ?? "—" },
    {
      key: "destination",
      header: "Destination",
      cell: (row) => row.destination ?? "—",
      hideOnMobile: true,
    },
    {
      key: "source",
      header: "Source",
      cell: (row) => <span className="text-xs">{row.source_page}</span>,
      hideOnMobile: true,
    },
    {
      key: "crm",
      header: "CRM",
      cell: (row) =>
        row.synced_to_crm ? (
          <StatusBadge status="synced" />
        ) : (
          <Button size="sm" variant="outline" onClick={() => syncToCrm(row.id)}>
            Sync
          </Button>
        ),
    },
    {
      key: "time",
      header: "Time",
      cell: (row) => formatDateTime(row.created_at),
      hideOnMobile: true,
    },
    {
      key: "quote",
      header: "Quote",
      cell: (row) => <CreateQuoteFromLeadButton lead={whatsappToLead(row)} />,
      hideOnMobile: true,
    },
  ];

  const profile = detailEmail ? getCustomerByEmail(detailEmail) : null;

  return (
    <PageMain>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-green-200/60 bg-green-50/30">
          <CardContent className="flex items-center gap-3 p-4">
            <MessageCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{items.length}</p>
              <p className="text-xs text-stone-600">Total leads</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-emerald-700">
              {items.filter((w) => w.synced_to_crm).length}
            </p>
            <p className="text-xs text-stone-600">Synced to CRM</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-amber-700">{linkedCount}</p>
            <p className="text-xs text-stone-600">Linked to inquiries</p>
          </CardContent>
        </Card>
      </div>

      <PageToolbar>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input
            placeholder="Search phone, name…"
            className="h-10 pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </PageToolbar>

      <DataTable
        columns={columns}
        data={filtered}
        mobileCard={(row) => (
          <div className="space-y-2">
            <div className="flex justify-between">
              <p className="font-semibold">{row.customer_name ?? row.phone}</p>
              <StatusBadge status={row.synced_to_crm ? "synced" : "pending"} />
            </div>
            <p className="text-sm text-stone-700">{row.selected_package}</p>
            {row.landing_url && (
              <a
                href={row.landing_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-amber-700"
              >
                <ExternalLink className="h-3 w-3" /> Landing URL
              </a>
            )}
            <p className="text-xs text-stone-400">{formatDateTime(row.created_at)}</p>
          </div>
        )}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cross-module links</CardTitle>
          <CardDescription>Same customers across WhatsApp, inquiries & downloads</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {linkedCustomers.slice(0, 4).map((c) => (
            <div
              key={c.email}
              className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2"
            >
              <span>
                <strong>{c.name}</strong> — {c.whatsapp.length} WA · {c.inquiries.length} inq ·{" "}
                {c.downloads.length} dl
              </span>
              <StatusBadge status={c.crmSynced ? "synced" : "pending"} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Sheet open={!!profile} onClose={() => setDetailEmail(null)} title="Linked customer" side="right">
        {profile && <CustomerLinkPanel profile={profile} />}
      </Sheet>
    </PageMain>
  );
}
