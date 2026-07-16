"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { Input, Select } from "@/components/ui/input";
import { listUnifiedLeads, type LeadSource, type UnifiedLead } from "@/lib/leads/unified-leads";
import { CreateQuoteFromLeadButton } from "@/components/leads/create-quote-from-lead-button";
import { formatDateTime } from "@/lib/utils";
import { Search } from "lucide-react";

const SOURCE_LABELS: Record<LeadSource, string> = {
  website_inquiry: "Website Inquiry",
  whatsapp: "WhatsApp",
  contact: "Contact Form",
  email: "Email",
};

export default function LeadsHubPage() {
  const [leads, setLeads] = useState<UnifiedLead[]>([]);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<LeadSource | "all">("all");

  useEffect(() => {
    setLeads(listUnifiedLeads());
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return leads.filter((l) => {
      const matchSource = source === "all" || l.source === source;
      const matchSearch =
        !q ||
        l.name.toLowerCase().includes(q) ||
        (l.email?.toLowerCase().includes(q) ?? false) ||
        (l.phone?.includes(q) ?? false) ||
        (l.destination?.toLowerCase().includes(q) ?? false);
      return matchSource && matchSearch;
    });
  }, [leads, search, source]);

  return (
    <>
      <Header
        title="Unified Leads"
        description="WhatsApp, email inquiries, and website forms — create quotes in one click"
      />
      <div className="space-y-4 px-4 pb-8 sm:px-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[200px] flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input
              placeholder="Search name, email, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={source}
            onChange={(e) => setSource(e.target.value as LeadSource | "all")}
            className="w-44"
          >
            <option value="all">All sources</option>
            {(Object.keys(SOURCE_LABELS) as LeadSource[]).map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((lead) => (
                <tr key={lead.id} className="hover:bg-amber-50/30">
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs">
                      {SOURCE_LABELS[lead.source]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{lead.name}</p>
                    <p className="text-xs text-stone-500">
                      {lead.email ?? lead.phone ?? "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">{lead.destination ?? lead.package_hint ?? "—"}</td>
                  <td className="px-4 py-3 capitalize">{lead.status}</td>
                  <td className="px-4 py-3 text-xs text-stone-500">
                    {formatDateTime(lead.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <CreateQuoteFromLeadButton lead={lead} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
