"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { CustomerLinkPanel } from "@/components/shared/customer-link-panel";
import {
  bootstrapCustomersFromTouchpoints,
  listCrmCustomersEnriched,
  type EnrichedCustomer,
} from "@/lib/crm/customer-directory";
import { pushCustomerToCrmWebhook } from "@/lib/crm/customers";
import { formatInr } from "@/lib/itinerary-builder/cost-engine";
import { useToast } from "@/components/ui/toast";
import { TableRowActions } from "@/components/ui/data-table";
import { RefreshCw, Search, User } from "lucide-react";

export function CustomersView() {
  const { show } = useToast();
  const [rows, setRows] = useState<EnrichedCustomer[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<EnrichedCustomer | null>(null);

  function refresh() {
    setRows(listCrmCustomersEnriched());
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.quotes.some((quote) => quote.quote_id.toLowerCase().includes(q))
    );
  }, [rows, search]);

  return (
    <>
      <Header
        title="Customers"
        description="CRM customers linked from leads, quotes, inquiries & WhatsApp"
      />
      <div className="space-y-4 px-4 pb-8 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input
              className="pl-9"
              placeholder="Search name, email, phone, quote…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              bootstrapCustomersFromTouchpoints();
              refresh();
              show("Synced customers from website touchpoints");
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Rebuild from leads
          </Button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Quotes</th>
                <th className="px-4 py-3">Touchpoints</th>
                <th className="px-4 py-3">CRM</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-amber-50/30">
                  <td className="px-4 py-3 font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-stone-400" />
                      {c.name}
                    </span>
                  </td>
                  <td className="px-4 py-3">{c.email ?? "—"}</td>
                  <td className="px-4 py-3">{c.phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    {c.quote_count > 0 ? (
                      <div className="space-y-0.5">
                        {c.quotes.slice(0, 2).map((q) => (
                          <Link
                            key={q.id}
                            href={`/itinerary-builder/${q.id}`}
                            className="block text-xs font-medium text-blue-700 hover:underline"
                          >
                            {q.quote_id} · {formatInr(q.grand_total)}
                          </Link>
                        ))}
                        {c.quote_count > 2 && (
                          <p className="text-[10px] text-stone-500">+{c.quote_count - 2} more</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-stone-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{c.touchpoint_count}</td>
                  <td className="px-4 py-3">
                    <Badge variant={c.crm_synced ? "success" : "default"}>
                      {c.crm_synced ? "Synced" : "Pending"}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <TableRowActions className="gap-1">
                      <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => setSelected(c)}>
                        View
                      </Button>
                      {!c.crm_synced && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="shrink-0"
                          onClick={async () => {
                            const ok = await pushCustomerToCrmWebhook(c, {
                              quote_ids: c.quotes.map((q) => q.quote_id),
                            });
                            show(ok ? `Pushed ${c.name} to CRM` : "CRM push failed / demo only");
                            refresh();
                          }}
                        >
                          Sync CRM
                        </Button>
                      )}
                    </TableRowActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="p-8 text-center text-sm text-stone-500">
              No customers yet. Convert a lead to a quote, or click Rebuild from leads.
            </p>
          )}
        </div>
      </div>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title="Customer profile">
        {selected && (
          <div className="space-y-4">
            {selected.profile ? (
              <CustomerLinkPanel profile={selected.profile} />
            ) : (
              <div className="rounded-xl bg-amber-50 p-4">
                <p className="font-semibold">{selected.name}</p>
                <p className="text-sm text-stone-600">{selected.email ?? "No email"}</p>
                <p className="text-sm text-stone-600">{selected.phone ?? "No phone"}</p>
              </div>
            )}
            {selected.quotes.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Linked quotes
                </h3>
                <ul className="space-y-2">
                  {selected.quotes.map((q) => (
                    <li key={q.id}>
                      <Link
                        href={`/itinerary-builder/${q.id}`}
                        className="flex items-center justify-between rounded-xl border border-stone-100 px-3 py-2 text-sm hover:bg-stone-50"
                      >
                        <span className="font-medium text-blue-700">{q.quote_id}</span>
                        <span className="tabular-nums text-stone-600">{formatInr(q.grand_total)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
