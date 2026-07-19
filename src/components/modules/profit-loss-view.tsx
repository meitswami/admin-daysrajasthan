"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatInr } from "@/lib/itinerary-builder/cost-engine";
import {
  expenseTotal,
  formatDisplayDate,
  getExpenses,
  listConfirmedBookings,
  saveExpenses,
} from "@/lib/operations/store";
import type { ClientItineraryRecord } from "@/types/itinerary-builder";
import type { ExpenseLine } from "@/types/operations";
import {
  ArrowUpRight,
  Download,
  Pencil,
  TrendingUp,
  Wallet,
  CircleDollarSign,
} from "lucide-react";

type Row = ClientItineraryRecord & {
  expenses: number;
  profit: number;
};

export function ProfitLossView() {
  const { show } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editId, setEditId] = useState<string | null>(null);
  const [lines, setLines] = useState<ExpenseLine[]>([]);

  function refresh() {
    setRows(
      listConfirmedBookings().map((b) => {
        const expenses = expenseTotal(b.id);
        const paid = b.amount_paid || 0;
        return { ...b, expenses, profit: paid - expenses };
      })
    );
  }

  useEffect(() => {
    refresh();
  }, []);

  const totals = useMemo(() => {
    const payments = rows.reduce((s, r) => s + (r.amount_paid || 0), 0);
    const expenses = rows.reduce((s, r) => s + r.expenses, 0);
    return { payments, expenses, net: payments - expenses };
  }, [rows]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  }

  function openExpenses(id: string) {
    const existing = getExpenses(id);
    setLines(
      existing.lines.length
        ? existing.lines
        : [{ id: crypto.randomUUID(), label: "", amount: 0 }]
    );
    setEditId(id);
  }

  function saveExpenseModal() {
    if (!editId) return;
    saveExpenses(
      editId,
      lines.filter((l) => l.label.trim() || l.amount > 0)
    );
    show("Expenses saved");
    setEditId(null);
    refresh();
  }

  function exportSelected() {
    const list = rows.filter((r) => selected.has(r.id));
    if (list.length === 0) {
      show("Select at least one row");
      return;
    }
    const header = [
      "Booking ID",
      "Client",
      "Status",
      "Total Amount",
      "Successful Payments",
      "Expenses",
      "Profit/Loss",
      "Travel Date",
    ];
    const body = list.map((r) =>
      [
        r.quote_id,
        r.client_name,
        r.workflow_status,
        r.grand_total,
        r.amount_paid,
        r.expenses,
        r.profit,
        formatDisplayDate(r.travel_date),
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...body].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `profit-loss-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Header
        title="Profit & Loss"
        description="All booked & completed bookings — payments vs expenses"
      />
      <div className="space-y-4 px-4 pb-8 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-start gap-3 pt-5">
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase text-stone-500">Total Successful Payments</p>
                <p className="mt-1 text-xl font-semibold text-emerald-700">
                  {formatInr(totals.payments)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-3 pt-5">
              <div className="rounded-lg bg-red-50 p-2 text-red-600">
                <CircleDollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase text-stone-500">Total Expenses</p>
                <p className="mt-1 text-xl font-semibold text-red-600">
                  {formatInr(totals.expenses)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start gap-3 pt-5">
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase text-stone-500">Net Profit / Loss</p>
                <p
                  className={`mt-1 text-xl font-semibold ${
                    totals.net >= 0 ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {formatInr(totals.net)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={selected.size === 0}
            onClick={exportSelected}
          >
            <Download className="h-4 w-4" />
            Export Selected to Excel
          </Button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
              <tr>
                <th className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selected.size === rows.length}
                    onChange={toggleAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="px-3 py-3">Booking ID</th>
                <th className="px-3 py-3">Client Name</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Total Amount</th>
                <th className="px-3 py-3">Successful Payments</th>
                <th className="px-3 py-3">Expenses</th>
                <th className="px-3 py-3">Profit / Loss</th>
                <th className="px-3 py-3">Travel Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-stone-500">
                    No booked trips yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-amber-50/30">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggle(r.id)}
                        aria-label={`Select ${r.quote_id}`}
                      />
                    </td>
                    <td className="px-3 py-3 font-medium">{r.quote_id}</td>
                    <td className="px-3 py-3">{r.client_name}</td>
                    <td className="px-3 py-3">
                      <Badge variant="info">
                        {r.workflow_status === "completed" ? "Completed" : "Booked"}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">{formatInr(r.grand_total)}</td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-emerald-700">
                        {formatInr(r.amount_paid)}
                      </div>
                      <div className="text-xs text-stone-500">
                        {r.payment_status.replace(/_/g, " ")}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div>Total: {formatInr(r.expenses)}</div>
                      <button
                        type="button"
                        className="mt-0.5 inline-flex items-center gap-1 text-xs text-amber-700 hover:underline"
                        onClick={() => openExpenses(r.id)}
                      >
                        <Pencil className="h-3 w-3" />
                        Add/Edit
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={r.profit >= 0 ? "success" : "danger"}>
                        <ArrowUpRight className="mr-0.5 h-3 w-3" />
                        {r.profit >= 0 ? "Profit" : "Loss"}: {formatInr(Math.abs(r.profit))}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">{formatDisplayDate(r.travel_date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={Boolean(editId)}
        onClose={() => setEditId(null)}
        title="Add / Edit Expenses"
        className="sm:max-w-lg"
      >
        <div className="space-y-3">
          {lines.map((line, i) => (
            <div key={line.id} className="grid grid-cols-[1fr_120px_auto] gap-2">
              <div>
                {i === 0 && <Label className="text-xs">Label</Label>}
                <Input
                  placeholder="e.g. Hotel payment"
                  value={line.label}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l) => (l.id === line.id ? { ...l, label: e.target.value } : l))
                    )
                  }
                />
              </div>
              <div>
                {i === 0 && <Label className="text-xs">Amount</Label>}
                <Input
                  type="number"
                  value={line.amount}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((l) =>
                        l.id === line.id ? { ...l, amount: Number(e.target.value) || 0 } : l
                      )
                    )
                  }
                />
              </div>
              <div className={i === 0 ? "pt-5" : ""}>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setLines((prev) => prev.filter((l) => l.id !== line.id))}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              setLines((prev) => [...prev, { id: crypto.randomUUID(), label: "", amount: 0 }])
            }
          >
            + Add line
          </Button>
          <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setEditId(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveExpenseModal}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
