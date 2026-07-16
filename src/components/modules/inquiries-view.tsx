"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Label, Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { DataTable, PageMain, PageToolbar, type Column } from "@/components/ui/data-table";
import { Sheet } from "@/components/ui/sheet";
import { CustomerLinkPanel } from "@/components/shared/customer-link-panel";
import { getCustomerByEmail } from "@/lib/data/customer-links";
import { getLeadScore, summarizeInquiry } from "@/lib/data/search";
import { downloadCsv } from "@/lib/utils/csv";
import { LeadScoreBadge } from "@/components/ui/lead-score-badge";
import type { PackageInquiry, InquiryStatus } from "@/types/database";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Download, Search, Users, Calendar, Sparkles } from "lucide-react";
import { CreateQuoteFromLeadButton } from "@/components/leads/create-quote-from-lead-button";
import { listUnifiedLeads } from "@/lib/leads/unified-leads";

const STATUSES: InquiryStatus[] = ["new", "contacted", "quoted", "converted", "closed"];

export function InquiriesView({ initialData }: { initialData: PackageInquiry[] }) {
  const { show } = useToast();
  const [items, setItems] = useState(initialData);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailEmail, setDetailEmail] = useState<string | null>(null);
  const [selected, setSelected] = useState<PackageInquiry | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return items.filter((row) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        row.customer_name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        (row.destination?.toLowerCase().includes(q) ?? false);
      const matchStatus = statusFilter === "all" || row.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [items, search, statusFilter]);

  function updateStatus(id: string, status: InquiryStatus) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    setSelected((prev) => (prev?.id === id ? { ...prev, status } : prev));
    show(`Status updated to ${status}`);
  }

  const columns: Column<PackageInquiry>[] = [
    {
      key: "customer",
      header: "Customer",
      cell: (row) => (
        <button type="button" className="text-left" onClick={() => setSelected(row)}>
          <p className="font-medium text-amber-900 hover:underline">{row.customer_name}</p>
          <p className="text-xs text-stone-500">{row.email}</p>
        </button>
      ),
    },
    { key: "destination", header: "Destination", cell: (row) => row.destination ?? "—" },
    { key: "travel", header: "Travel date", cell: (row) => (row.travel_date ? formatDate(row.travel_date) : "—"), hideOnMobile: true },
    { key: "pax", header: "Pax", cell: (row) => `${row.adults}A ${row.children}C`, hideOnMobile: true },
    { key: "budget", header: "Budget", cell: (row) => <span className="text-xs">{row.budget}</span>, hideOnMobile: true },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Select
          value={row.status}
          onChange={(e) => updateStatus(row.id, e.target.value as InquiryStatus)}
          className="h-8 w-28 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      ),
    },
    {
      key: "score",
      header: "Score",
      cell: (row) => {
        const { score, label } = getLeadScore(row);
        return <LeadScoreBadge score={score} label={label} />;
      },
      hideOnMobile: true,
    },
  ];

  function handleExport() {
    downloadCsv(
      "inquiries.csv",
      ["Customer", "Email", "Destination", "Travel Date", "Adults", "Children", "Budget", "Status"],
      filtered.map((r) => [
        r.customer_name, r.email, r.destination ?? "", r.travel_date ?? "",
        String(r.adults), String(r.children), r.budget ?? "", r.status,
      ])
    );
  }

  const profile = detailEmail ? getCustomerByEmail(detailEmail) : null;

  return (
    <PageMain>
      <PageToolbar>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input placeholder="Search customer, destination…" className="h-10 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Select className="h-10 w-full sm:w-36" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4" /> Export</Button>
        </div>
      </PageToolbar>

      <DataTable
        columns={columns}
        data={filtered}
        mobileCard={(row) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <button type="button" className="text-left" onClick={() => setSelected(row)}>
                <p className="font-semibold text-amber-900">{row.customer_name}</p>
                <p className="text-sm text-stone-500">{row.destination}</p>
              </button>
              <StatusBadge status={row.status} />
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-stone-600">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{row.travel_date ? formatDate(row.travel_date) : "TBD"}</span>
              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{row.adults}+{row.children}</span>
            </div>
            <Select value={row.status} onChange={(e) => updateStatus(row.id, e.target.value as InquiryStatus)} className="h-9 text-xs">
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        )}
      />

      <Sheet open={!!selected} onClose={() => { setSelected(null); setAiSummary(null); }} title="Inquiry details" side="right">
        {selected && (
          <div className="space-y-4">
            <div className="rounded-xl bg-stone-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold">{selected.customer_name}</p>
                <LeadScoreBadge {...getLeadScore(selected)} />
              </div>
              <p className="text-sm text-stone-600">{selected.email} · {selected.mobile}</p>
              <p className="mt-2 text-sm"><strong>Destination:</strong> {selected.destination}</p>
              <p className="text-sm"><strong>Travel:</strong> {selected.travel_date ? formatDate(selected.travel_date) : "TBD"} · {selected.adults} adults, {selected.children} children</p>
              <p className="text-sm"><strong>Budget:</strong> {selected.budget}</p>
              <p className="mt-2 text-xs text-stone-500">Source: {selected.source_page} · {formatDateTime(selected.created_at)}</p>
            </div>
            {selected.additional_requirements && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <Label>Requirements</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setAiSummary(summarizeInquiry(selected.additional_requirements!))}
                  >
                    <Sparkles className="h-3.5 w-3.5" /> AI Summarize
                  </Button>
                </div>
                <Textarea readOnly value={selected.additional_requirements} className="text-sm" />
                {aiSummary && (
                  <div className="mt-2 rounded-lg border border-violet-200 bg-violet-50/80 p-3 text-sm text-violet-900">
                    <p className="text-xs font-semibold uppercase text-violet-600">AI summary</p>
                    <p className="mt-1">{aiSummary}</p>
                  </div>
                )}
              </div>
            )}
            <div>
              <Label>Update status</Label>
              <Select
                value={selected.status}
                onChange={(e) => updateStatus(selected.id, e.target.value as InquiryStatus)}
                className="mt-1.5"
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <Button variant="outline" className="w-full" onClick={() => { setDetailEmail(selected.email); setSelected(null); }}>
              View linked customer profile
            </Button>
            {(() => {
              const lead = listUnifiedLeads().find(
                (l) => l.source === "website_inquiry" && l.source_id === selected.id
              );
              return lead ? (
                <div className="pt-2">
                  <CreateQuoteFromLeadButton lead={lead} />
                </div>
              ) : null;
            })()}
          </div>
        )}
      </Sheet>

      <Sheet open={!!profile} onClose={() => setDetailEmail(null)} title="Linked customer" side="right">
        {profile && <CustomerLinkPanel profile={profile} />}
      </Sheet>
    </PageMain>
  );
}
