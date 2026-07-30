"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Select } from "@/components/ui/input";
import { formatInr } from "@/lib/itinerary-builder/cost-engine";
import {
  cloneClientItinerary,
  isPendingStatus,
  softDeleteClientItinerary,
  updatePaymentStatus,
} from "@/lib/itinerary-builder/storage";
import type { ClientItineraryRecord, PaymentStatus } from "@/types/itinerary-builder";
import { formatDate } from "@/lib/utils";
import { SendItineraryEmailButton } from "@/components/email/send-itinerary-email-button";
import {
  Download,
  Edit,
  Eye,
  MessageCircle,
  Plus,
  Trash2,
  User,
  IndianRupee,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useSystem } from "@/components/providers/system-provider";

function whatsappUrl(record: ClientItineraryRecord) {
  const phone = record.client_phone?.replace(/\D/g, "") ?? "";
  const text = encodeURIComponent(
    `Hello ${record.client_name}, your quote ${record.quote_id} from Travel Days is ready.`
  );
  return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function ItineraryListTable({
  records,
  onRefresh,
  showTrashAction = true,
}: {
  records: ClientItineraryRecord[];
  onRefresh: () => void;
  showTrashAction?: boolean;
}) {
  const { show } = useToast();
  const { can } = useSystem();
  const [paymentOpen, setPaymentOpen] = useState<ClientItineraryRecord | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("unpaid");
  const [amountPaid, setAmountPaid] = useState(0);

  function openPayment(record: ClientItineraryRecord) {
    setPaymentOpen(record);
    setPaymentStatus(record.payment_status);
    setAmountPaid(record.amount_paid);
  }

  function savePayment() {
    if (!paymentOpen) return;
    updatePaymentStatus(paymentOpen.id, paymentStatus, amountPaid);
    show(`Payment updated for ${paymentOpen.quote_id}`);
    setPaymentOpen(null);
    onRefresh();
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Created By</th>
              <th className="px-4 py-3 hidden lg:table-cell">Created Date</th>
              <th className="px-4 py-3">Client Name</th>
              <th className="px-4 py-3 hidden md:table-cell">Travel Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Grand Total</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {records.map((r) => (
              <tr key={r.id} className="hover:bg-amber-50/30">
                <td className="px-4 py-3 font-semibold text-blue-700">{r.quote_id}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-stone-400" />
                    {r.owner_name}
                  </span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-stone-600">
                  {formatDate(r.created_at)}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <User className="h-3.5 w-3.5 text-stone-400" />
                    {r.client_name}
                  </span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {r.travel_date ? formatDate(r.travel_date) : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      isPendingStatus(r.workflow_status)
                        ? "bg-blue-100 text-blue-800"
                        : "bg-emerald-100 text-emerald-800"
                    )}
                  >
                    {isPendingStatus(r.workflow_status) ? "Pending" : "Confirmed"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    { (r.category_totals ?? []).length > 0 ? (
                      (r.category_totals ?? []).map((t) => (
                        <p key={t.category_key} className="text-xs text-stone-700">
                          {t.label.toLowerCase()}:{" "}
                          <span className="font-semibold tabular-nums">{formatInr(t.grand_total)}</span>
                        </p>
                      ))
                    ) : (
                      <p className="font-semibold tabular-nums">{formatInr(r.grand_total)}</p>
                    )}
                    <span
                      className={cn(
                        "inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                        r.payment_status === "paid"
                          ? "bg-emerald-100 text-emerald-800"
                          : r.payment_status === "partial"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-700"
                      )}
                    >
                      {r.payment_status === "paid"
                        ? "Paid"
                        : r.payment_status === "partial"
                          ? "Partial"
                          : "Unpaid"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1">
                    <a
                      href={whatsappUrl(r)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                      title="WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                    {can("email.send") && <SendItineraryEmailButton record={r} onSent={onRefresh} />}
                    {can("itinerary_builder.create") && (
                    <button
                      type="button"
                      onClick={() => {
                        const copy = cloneClientItinerary(r.id);
                        if (copy) {
                          show(`Cloned as ${copy.quote_id}`);
                          onRefresh();
                        }
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white hover:bg-violet-700"
                      title="Clone"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    )}
                    <Link
                      href={`/itinerary-builder/${r.id}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white hover:bg-amber-600"
                      title="View"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/itinerary-builder/${r.id}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-lime-700 text-white hover:bg-lime-800"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/itinerary-builder/${r.id}/quotation`}
                      target="_blank"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white hover:bg-sky-700"
                      title="Download PDF"
                    >
                      <Download className="h-4 w-4" />
                    </Link>
                    {showTrashAction && (
                      <button
                        type="button"
                        onClick={() => {
                          softDeleteClientItinerary(r.id);
                          show(`Moved ${r.quote_id} to trash`);
                          onRefresh();
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white hover:bg-red-700"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    {can("itinerary_builder.edit") && (
                    <button
                      type="button"
                      onClick={() => openPayment(r)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg bg-violet-700 px-2 text-xs font-medium text-white hover:bg-violet-800"
                      title="Payments"
                    >
                      <IndianRupee className="h-3.5 w-3.5" />
                      Payments
                    </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 && (
          <p className="p-8 text-center text-sm text-stone-500">No itineraries found.</p>
        )}
      </div>

      <Modal
        open={!!paymentOpen}
        onClose={() => setPaymentOpen(null)}
        title={`Payments — ${paymentOpen?.quote_id ?? ""}`}
        description="Record payment status for this quote"
      >
        {paymentOpen && (
          <div className="space-y-4">
            <p className="text-sm text-stone-600">
              Grand total: {formatInr(paymentOpen.grand_total)}
            </p>
            <div>
              <Label>Status</Label>
              <Select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="mt-1.5"
              >
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </Select>
            </div>
            <div>
              <Label>Amount received (₹)</Label>
              <Input
                type="number"
                min={0}
                value={amountPaid}
                onChange={(e) => setAmountPaid(Number(e.target.value) || 0)}
                className="mt-1.5"
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setPaymentOpen(null)}>
                Cancel
              </Button>
              <Button type="button" className="flex-1" onClick={savePayment}>
                Save
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
