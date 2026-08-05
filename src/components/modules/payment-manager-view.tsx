"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileUploadField } from "@/components/ui/file-upload-field";
import { Input, Label, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { formatInr } from "@/lib/itinerary-builder/cost-engine";
import {
  isPendingStatus,
  listClientItineraries,
} from "@/lib/itinerary-builder/storage";
import {
  addPayment,
  formatDisplayDate,
  hydrateOperationsFromSupabase,
  listPayments,
  updatePayment,
} from "@/lib/operations/store";
import type { ClientItineraryRecord, PaymentStatus } from "@/types/itinerary-builder";
import type { PaymentEntry, PaymentEntryStatus } from "@/types/operations";
import { cn } from "@/lib/utils";
import {
  Car,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  FileText,
  Filter,
  MessageCircle,
  Pencil,
  Plus,
  Settings,
} from "lucide-react";

const MAIN_TABS = [
  { id: "regular", label: "Regular Itinerary Payment" },
  { id: "final", label: "Final Itinerary Payment" },
] as const;

type MainTab = (typeof MAIN_TABS)[number]["id"];

function paymentBadgeVariant(status: PaymentStatus): "danger" | "warning" | "success" {
  if (status === "paid") return "success";
  if (status === "partial") return "warning";
  return "danger";
}

function paymentLabel(status: PaymentStatus) {
  if (status === "paid") return "Paid";
  if (status === "partial") return "Partial";
  return "Unpaid";
}

function entryStatusVariant(status: PaymentEntryStatus): "warning" | "success" | "danger" | "default" {
  if (status === "success") return "success";
  if (status === "failed") return "danger";
  if (status === "pending") return "warning";
  return "default";
}

function whatsappUrl(record: ClientItineraryRecord) {
  const phone = record.client_phone?.replace(/\D/g, "") ?? "";
  const text = encodeURIComponent(
    `Hello ${record.client_name}, regarding payment for ${record.quote_id} (${formatInr(record.grand_total)}).`
  );
  return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
}

type PaymentFormState = {
  amount: string;
  method: string;
  gateway: string;
  status: PaymentEntryStatus;
  receipt_url: string;
  screenshot_data_url: string | null;
};

const emptyForm = (): PaymentFormState => ({
  amount: "",
  method: "",
  gateway: "",
  status: "pending",
  receipt_url: "",
  screenshot_data_url: null,
});

export function PaymentManagerView() {
  const { show } = useToast();
  const [tab, setTab] = useState<MainTab>("regular");
  const [records, setRecords] = useState<ClientItineraryRecord[]>([]);
  const [paymentsById, setPaymentsById] = useState<Record<string, PaymentEntry[]>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterPayment, setFilterPayment] = useState<"all" | PaymentStatus>("all");
  const [filterQuery, setFilterQuery] = useState("");

  const [manageRecord, setManageRecord] = useState<ClientItineraryRecord | null>(null);
  const [detailsRecord, setDetailsRecord] = useState<ClientItineraryRecord | null>(null);
  const [ledger, setLedger] = useState<PaymentEntry[]>([]);
  const [form, setForm] = useState<PaymentFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  function refresh() {
    const list = listClientItineraries();
    setRecords(list);
    const map: Record<string, PaymentEntry[]> = {};
    for (const r of list) {
      map[r.id] = listPayments(r.id);
    }
    setPaymentsById(map);
  }

  useEffect(() => {
    void hydrateOperationsFromSupabase().then(() => refresh());
  }, []);

  function loadLedger(itineraryId: string) {
    const entries = listPayments(itineraryId);
    setLedger(entries);
    setPaymentsById((prev) => ({ ...prev, [itineraryId]: entries }));
  }

  const regularRows = useMemo(
    () => records.filter((r) => isPendingStatus(r.workflow_status)),
    [records]
  );

  const finalRows = useMemo(() => {
    let list = records.filter((r) =>
      ["booking_confirmed", "completed"].includes(r.workflow_status)
    );
    if (filterPayment !== "all") {
      list = list.filter((r) => r.payment_status === filterPayment);
    }
    const q = filterQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.quote_id.toLowerCase().includes(q) ||
          r.client_name.toLowerCase().includes(q) ||
          (r.client_email ?? "").toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q)
      );
    }
    return list;
  }, [records, filterPayment, filterQuery]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(ids: string[]) {
    if (ids.every((id) => selected.has(id))) {
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  function openManage(record: ClientItineraryRecord) {
    setManageRecord(record);
    setDetailsRecord(null);
    setForm(emptyForm());
    setEditingId(null);
    loadLedger(record.id);
  }

  function openDetails(record: ClientItineraryRecord) {
    setDetailsRecord(record);
    setManageRecord(null);
    loadLedger(record.id);
  }

  function startEdit(entry: PaymentEntry) {
    setEditingId(entry.id);
    setForm({
      amount: String(entry.amount),
      method: entry.method,
      gateway: entry.gateway,
      status: entry.status,
      receipt_url: entry.receipt_url,
      screenshot_data_url: entry.screenshot_data_url,
    });
  }

  async function submitPayment() {
    if (!manageRecord) return;
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      show("Enter a valid amount");
      return;
    }
    try {
      if (editingId) {
        await updatePayment(manageRecord.id, editingId, {
          amount,
          method: form.method,
          gateway: form.gateway,
          status: form.status,
          receipt_url: form.receipt_url,
          screenshot_data_url: form.screenshot_data_url,
        });
        show("Payment updated");
      } else {
        await addPayment(manageRecord.id, {
          amount,
          method: form.method,
          gateway: form.gateway,
          status: form.status,
          receipt_url: form.receipt_url,
          screenshot_data_url: form.screenshot_data_url,
        });
        show("Payment added");
      }
      setForm(emptyForm());
      setEditingId(null);
      loadLedger(manageRecord.id);
      refresh();
      const updated = listClientItineraries().find((r) => r.id === manageRecord.id);
      if (updated) setManageRecord(updated);
    } catch (err) {
      show(err instanceof Error ? err.message : "Failed to save payment");
    }
  }

  return (
    <>
      <Header
        title="Payment Manager"
        description="Track regular quote advances and final booking payments"
      />

      <div className="space-y-4 px-4 pb-8 sm:px-6">
        <Tabs
          tabs={[...MAIN_TABS]}
          active={tab}
          onChange={(id) => setTab(id as MainTab)}
        />

        {tab === "regular" && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-stone-900">Regular Payments Management</h2>
            <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label="Select all"
                        checked={
                          regularRows.length > 0 &&
                          regularRows.every((r) => selected.has(r.id))
                        }
                        onChange={() => toggleAll(regularRows.map((r) => r.id))}
                      />
                    </th>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Client Name</th>
                    <th className="px-4 py-3">Travel Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Grand Total</th>
                    <th className="px-4 py-3">Payments</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {regularRows.map((r) => {
                    const balance = Math.max(0, r.grand_total - (r.amount_paid || 0));
                    const pendingAmt = (paymentsById[r.id] ?? [])
                      .filter((p) => p.status === "pending")
                      .reduce((s, p) => s + p.amount, 0);
                    return (
                      <tr key={r.id} className="hover:bg-amber-50/30">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(r.id)}
                            onChange={() => toggle(r.id)}
                            aria-label={`Select ${r.quote_id}`}
                          />
                        </td>
                        <td className="px-4 py-3 font-semibold text-sky-700">{r.quote_id}</td>
                        <td className="px-4 py-3 font-medium text-stone-900">{r.client_name}</td>
                        <td className="px-4 py-3 text-stone-600">
                          {formatDisplayDate(r.travel_date)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant="info">Pending</Badge>
                            <Badge variant={paymentBadgeVariant(r.payment_status)}>
                              {paymentLabel(r.payment_status)}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold tabular-nums">{formatInr(r.grand_total)}</p>
                          <p className="text-xs text-stone-500">
                            Balance: {formatInr(balance)}
                          </p>
                          <Badge
                            variant={paymentBadgeVariant(r.payment_status)}
                            className="mt-1"
                          >
                            {paymentLabel(r.payment_status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {pendingAmt > 0 ? (
                            <span className="text-sm text-stone-700">
                              {formatInr(pendingAmt)}{" "}
                              <span className="text-amber-700">(pending)</span>
                            </span>
                          ) : r.amount_paid > 0 ? (
                            <span className="text-sm text-stone-700">
                              {formatInr(r.amount_paid)}
                            </span>
                          ) : (
                            <span className="text-stone-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            type="button"
                            size="sm"
                            className="bg-sky-600 hover:bg-sky-700"
                            onClick={() => openManage(r)}
                          >
                            Payments
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {regularRows.length === 0 && (
                <p className="p-8 text-center text-sm text-stone-500">
                  No regular (pending) itineraries found.
                </p>
              )}
            </div>
          </section>
        )}

        {tab === "final" && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
                <CreditCard className="h-5 w-5 text-sky-600" />
                Final Itinerary Payment
              </h2>
              <Button
                type="button"
                variant="outline"
                className="border-sky-200 text-sky-700 hover:bg-sky-50"
                onClick={() => setFiltersOpen((v) => !v)}
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </div>

            {filtersOpen && (
              <div className="grid gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-2">
                <div>
                  <Label>Search</Label>
                  <Input
                    className="mt-1.5"
                    placeholder="Booking ID, client, email…"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Payment status</Label>
                  <Select
                    className="mt-1.5"
                    value={filterPayment}
                    onChange={(e) =>
                      setFilterPayment(e.target.value as "all" | PaymentStatus)
                    }
                  >
                    <option value="all">All</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                  </Select>
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
                  <tr>
                    <th className="px-4 py-3">Booking</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Travel Date</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Booking Status</th>
                    <th className="px-4 py-3">Payment Status</th>
                    <th className="px-4 py-3">Payments</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {finalRows.map((r) => {
                    const balance = Math.max(0, r.grand_total - (r.amount_paid || 0));
                    const successPaid = (paymentsById[r.id] ?? [])
                      .filter((p) => p.status === "success")
                      .reduce((s, p) => s + p.amount, 0);
                    const displayPaid = successPaid || r.amount_paid;
                    return (
                      <tr key={r.id} className="hover:bg-amber-50/30">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-sky-700">#{r.quote_id}</p>
                          <p className="max-w-[200px] truncate text-xs text-stone-500">
                            {r.title}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-stone-900">{r.client_name}</p>
                          <p className="text-xs text-stone-500">{r.client_email || "—"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-stone-700">
                            <Car className="h-3.5 w-3.5 text-stone-400" />
                            {formatDisplayDate(r.travel_date)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold tabular-nums">
                            {formatInr(r.grand_total)}
                          </p>
                          <p className="text-xs text-stone-500">
                            Balance: {formatInr(balance)}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Booked
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={paymentBadgeVariant(r.payment_status)}
                            className="gap-1"
                          >
                            {r.payment_status === "partial" ? (
                              <Clock className="h-3 w-3" />
                            ) : r.payment_status === "paid" ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : null}
                            {paymentLabel(r.payment_status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {displayPaid > 0 ? (
                            <Badge variant="default">
                              {formatInr(displayPaid)}{" "}
                              {successPaid > 0 ? "success" : ""}
                            </Badge>
                          ) : (
                            <span className="text-stone-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-1">
                            <button
                              type="button"
                              title="View booking"
                              onClick={() => openDetails(r)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white hover:bg-sky-700"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <Link
                              href={`/itinerary-builder/${r.id}/quotation`}
                              target="_blank"
                              title="Quotation"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white hover:bg-sky-700"
                            >
                              <FileText className="h-4 w-4" />
                            </Link>
                            <button
                              type="button"
                              title="Manage payments"
                              onClick={() => openManage(r)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white hover:bg-sky-700"
                            >
                              <Settings className="h-4 w-4" />
                            </button>
                            <a
                              href={whatsappUrl(r)}
                              target="_blank"
                              rel="noreferrer"
                              title="WhatsApp"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </a>
                            <button
                              type="button"
                              title="Add payment"
                              onClick={() => openManage(r)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white hover:bg-sky-700"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {finalRows.length === 0 && (
                <p className="p-8 text-center text-sm text-stone-500">
                  No confirmed bookings found.
                </p>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Manage Payments modal */}
      <Modal
        open={!!manageRecord}
        onClose={() => {
          setManageRecord(null);
          setEditingId(null);
          setForm(emptyForm());
        }}
        title={
          manageRecord
            ? `Manage Payments for ${isPendingStatus(manageRecord.workflow_status) ? "Pending" : "Booking"}`
            : "Manage Payments"
        }
        description={
          manageRecord
            ? `${isPendingStatus(manageRecord.workflow_status) ? "Pending ID" : "Booking"} #${manageRecord.quote_id} — ${manageRecord.client_name}`
            : undefined
        }
        className="sm:max-w-3xl"
      >
        {manageRecord && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  className="mt-1.5"
                  placeholder="Enter amount"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  className="mt-1.5"
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      status: e.target.value as PaymentEntryStatus,
                    }))
                  }
                >
                  <option value="pending">Pending</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                </Select>
              </div>
              <div>
                <Label>Payment Method</Label>
                <Input
                  className="mt-1.5"
                  placeholder="e.g., Credit Card, UPI, Bank Transfer"
                  value={form.method}
                  onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
                />
              </div>
              <div>
                <Label>Receipt URL</Label>
                <Input
                  className="mt-1.5"
                  placeholder="https://example.com/receipt"
                  value={form.receipt_url}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, receipt_url: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Gateway</Label>
                <Input
                  className="mt-1.5"
                  placeholder="e.g., Razorpay, Stripe, PayPal"
                  value={form.gateway}
                  onChange={(e) => setForm((f) => ({ ...f, gateway: e.target.value }))}
                />
              </div>
              <div>
                <FileUploadField
                  label="Screenshot"
                  value={form.screenshot_data_url}
                  onChange={(dataUrl) =>
                    setForm((f) => ({ ...f, screenshot_data_url: dataUrl }))
                  }
                />
              </div>
            </div>

            <Button
              type="button"
              className="w-full bg-sky-600 hover:bg-sky-700"
              onClick={submitPayment}
            >
              {editingId ? "Update Payment" : "Add Payment"}
            </Button>

            <PaymentHistoryTable
              entries={ledger}
              onEdit={startEdit}
              compact
            />
          </div>
        )}
      </Modal>

      {/* Booking Details modal */}
      <Modal
        open={!!detailsRecord}
        onClose={() => setDetailsRecord(null)}
        title={
          detailsRecord
            ? `Booking Details #${detailsRecord.quote_id}`
            : "Booking Details"
        }
        className="sm:max-w-4xl"
      >
        {detailsRecord && (
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-semibold text-stone-700">Booking ID:</span>{" "}
                  #{detailsRecord.quote_id}
                </p>
                <p>
                  <span className="font-semibold text-stone-700">Itinerary Title:</span>{" "}
                  {detailsRecord.title}
                </p>
                <p>
                  <span className="font-semibold text-stone-700">Travel Date:</span>{" "}
                  {formatDisplayDate(detailsRecord.travel_date)}
                </p>
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-stone-700">Status:</span>
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Booked
                  </Badge>
                </p>
              </div>
              <div className="rounded-xl bg-stone-50 p-4 text-sm">
                <p className="mb-2 font-semibold text-stone-800">Payment Summary</p>
                <p>
                  <span className="text-stone-500">Total Amount:</span>{" "}
                  <span className="font-semibold tabular-nums">
                    {formatInr(detailsRecord.grand_total)}
                  </span>
                </p>
                <p>
                  <span className="text-stone-500">Balance Amount:</span>{" "}
                  <span className="font-semibold tabular-nums">
                    {formatInr(
                      Math.max(0, detailsRecord.grand_total - (detailsRecord.amount_paid || 0))
                    )}
                  </span>
                </p>
                <p className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-stone-500">Payment Status:</span>
                  <Badge variant={paymentBadgeVariant(detailsRecord.payment_status)}>
                    {paymentLabel(detailsRecord.payment_status)}
                  </Badge>
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-stone-100 p-4 text-sm">
              <p className="mb-2 font-semibold text-stone-800">Client Details</p>
              <p>
                <span className="text-stone-500">Name:</span> {detailsRecord.client_name}
              </p>
              <p>
                <span className="text-stone-500">Email:</span>{" "}
                {detailsRecord.client_email || "—"}
              </p>
              <p>
                <span className="text-stone-500">Phone:</span>{" "}
                {detailsRecord.client_phone || "—"}
              </p>
            </div>

            <PaymentHistoryTable entries={ledger} />

            <div className="flex justify-end">
              <Button
                type="button"
                className="bg-sky-600 hover:bg-sky-700"
                onClick={() => {
                  openManage(detailsRecord);
                }}
              >
                Manage Payments
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function PaymentHistoryTable({
  entries,
  onEdit,
  compact,
}: {
  entries: PaymentEntry[];
  onEdit?: (entry: PaymentEntry) => void;
  compact?: boolean;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-stone-900">Payment History</h3>
      <div className="overflow-x-auto rounded-xl border border-stone-200">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-stone-50 text-left text-[11px] uppercase text-stone-500">
            <tr>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Method</th>
              {!compact && <th className="px-3 py-2">Mobile</th>}
              {!compact && <th className="px-3 py-2">Transaction ID</th>}
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Receipt</th>
              <th className="px-3 py-2">Screenshot</th>
              {onEdit && <th className="px-3 py-2">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="px-3 py-2 font-semibold tabular-nums">
                  {formatInr(e.amount)}
                </td>
                <td className="px-3 py-2">{e.method || "—"}</td>
                {!compact && <td className="px-3 py-2">{e.mobile || "—"}</td>}
                {!compact && (
                  <td className="px-3 py-2">{e.transaction_id || "N/A"}</td>
                )}
                <td className="px-3 py-2">
                  <Badge variant={entryStatusVariant(e.status)} className="gap-1 capitalize">
                    {e.status === "success" && <CheckCircle2 className="h-3 w-3" />}
                    {e.status === "pending" && <Clock className="h-3 w-3" />}
                    {e.status}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-stone-600">
                  {formatDisplayDate(e.created_at)}
                </td>
                <td className="px-3 py-2">
                  {e.receipt_url ? (
                    <a
                      href={e.receipt_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-600 hover:underline"
                    >
                      View Receipt
                    </a>
                  ) : (
                    <span className="text-stone-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {e.screenshot_data_url ? (
                    <Image
                      src={e.screenshot_data_url}
                      alt="Payment screenshot"
                      width={40}
                      height={40}
                      unoptimized
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <span className="text-stone-400">—</span>
                  )}
                </td>
                {onEdit && (
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => onEdit(e)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white hover:bg-sky-700"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && (
          <p className={cn("p-6 text-center text-sm text-stone-500")}>
            No payments recorded yet.
          </p>
        )}
      </div>
    </div>
  );
}
