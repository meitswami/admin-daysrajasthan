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
import { downloadCsv } from "@/lib/utils/csv";
import type { ContactQuery } from "@/types/database";
import { formatDateTime } from "@/lib/utils";
import { Download, Search, Mail, Phone, CheckCircle2 } from "lucide-react";

export function ContactsView({ initialData }: { initialData: ContactQuery[] }) {
  const { show } = useToast();
  const [items, setItems] = useState(initialData);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailEmail, setDetailEmail] = useState<string | null>(null);
  const [selected, setSelected] = useState<ContactQuery | null>(null);

  const filtered = useMemo(() => {
    return items.filter((row) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        (row.subject?.toLowerCase().includes(q) ?? false);
      const matchStatus = statusFilter === "all" || row.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [items, search, statusFilter]);

  function markResolved(id: string) {
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, status: "resolved" as const } : c)));
    setSelected((prev) => (prev?.id === id ? { ...prev, status: "resolved" } : prev));
    show("Marked as resolved");
  }

  const columns: Column<ContactQuery>[] = [
    {
      key: "name",
      header: "Name",
      cell: (row) => (
        <button type="button" className="text-left" onClick={() => setSelected(row)}>
          <p className="font-medium text-amber-900 hover:underline">{row.name}</p>
          <p className="text-xs text-stone-500">{row.email}</p>
        </button>
      ),
    },
    { key: "subject", header: "Subject", cell: (row) => row.subject ?? "—", hideOnMobile: true },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { key: "date", header: "Date", cell: (row) => formatDateTime(row.created_at), hideOnMobile: true },
    {
      key: "action",
      header: "",
      cell: (row) =>
        row.status === "open" ? (
          <Button size="sm" variant="outline" onClick={() => markResolved(row.id)}>
            <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
          </Button>
        ) : null,
      hideOnMobile: true,
    },
  ];

  function handleExport() {
    downloadCsv(
      "contacts.csv",
      ["Name", "Email", "Mobile", "Subject", "Message", "Status"],
      filtered.map((r) => [r.name, r.email, r.mobile ?? "", r.subject ?? "", r.message, r.status])
    );
  }

  const profile = detailEmail ? getCustomerByEmail(detailEmail) : null;

  return (
    <PageMain>
      <PageToolbar>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input placeholder="Search name, email…" className="h-10 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Select className="h-10 w-full sm:w-32" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="open">open</option>
            <option value="resolved">resolved</option>
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
              <button type="button" onClick={() => setSelected(row)} className="text-left font-semibold text-amber-900">{row.name}</button>
              <StatusBadge status={row.status} />
            </div>
            <p className="text-sm font-medium text-stone-700">{row.subject}</p>
            <p className="line-clamp-2 text-sm text-stone-600">{row.message}</p>
            {row.status === "open" && (
              <Button size="sm" variant="outline" onClick={() => markResolved(row.id)}>Mark resolved</Button>
            )}
          </div>
        )}
      />

      <Sheet open={!!selected} onClose={() => setSelected(null)} title="Contact message" side="right">
        {selected && (
          <div className="space-y-4">
            <div className="rounded-xl bg-stone-50 p-4">
              <div className="flex items-start justify-between">
                <p className="text-lg font-semibold">{selected.name}</p>
                <StatusBadge status={selected.status} />
              </div>
              <div className="mt-2 space-y-1 text-sm text-stone-600">
                <p className="flex items-center gap-2"><Mail className="h-4 w-4" />{selected.email}</p>
                {selected.mobile && <p className="flex items-center gap-2"><Phone className="h-4 w-4" />{selected.mobile}</p>}
              </div>
              <p className="mt-3 font-medium text-stone-800">{selected.subject}</p>
              <p className="text-xs text-stone-500">{formatDateTime(selected.created_at)}</p>
            </div>
            <div>
              <Label>Message</Label>
              <Textarea readOnly value={selected.message} className="mt-1.5 min-h-[120px]" />
            </div>
            {selected.status === "open" && (
              <Button className="w-full" onClick={() => markResolved(selected.id)}>
                <CheckCircle2 className="h-4 w-4" /> Mark as resolved
              </Button>
            )}
            <Button variant="outline" className="w-full" onClick={() => { setDetailEmail(selected.email); setSelected(null); }}>
              View linked customer profile
            </Button>
          </div>
        )}
      </Sheet>

      <Sheet open={!!profile} onClose={() => setDetailEmail(null)} title="Linked customer" side="right">
        {profile && <CustomerLinkPanel profile={profile} />}
      </Sheet>
    </PageMain>
  );
}
