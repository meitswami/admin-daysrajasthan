"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getBookingEmailLogs, getEmailStats, resendMessage } from "@/lib/email/storage";
import { listClientItineraries } from "@/lib/itinerary-builder/storage";
import { SendItineraryEmailButton } from "@/components/email/send-itinerary-email-button";
import { formatDateTime } from "@/lib/utils";
import { RefreshCw, MessageCircle, Download, Edit, Eye } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function BookingEmailLog() {
  const { show } = useToast();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setTick((t) => t + 1);
  }, []);

  const stats = useMemo(() => getEmailStats(), [tick]);
  const logs = useMemo(() => {
    const stored = getBookingEmailLogs();
    if (stored.length > 0) return stored;
    return listClientItineraries().map((r) => ({
      id: r.id,
      message_id: r.id,
      quote_id: r.quote_id,
      itinerary_id: r.id,
      client_name: r.client_name,
      client_email: r.client_email,
      sent_at: r.updated_at,
      delivery_status: "pending" as const,
      seen: false,
      send_count: 0,
    }));
  }, [tick]);

  const records = listClientItineraries();
  const recordByQuote = Object.fromEntries(records.map((r) => [r.quote_id, r]));

  function refresh() {
    setTick((t) => t + 1);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Total Emails", stats.totalEmails],
          ["Total Sends", stats.totalSends],
          ["Pending", stats.pending],
          ["Seen", stats.seen],
          ["Unseen", stats.unseen],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
            <p className="text-xs text-blue-700">{label}</p>
            <p className="text-xl font-bold text-blue-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={refresh}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-3">Booking ID</th>
              <th className="px-4 py-3">Sent At</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Seen</th>
              <th className="px-4 py-3">Sends</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {logs.map((row) => {
              const record = recordByQuote[row.quote_id];
              return (
                <tr key={row.id} className="hover:bg-stone-50/80">
                  <td className="px-4 py-3">
                    <Link
                      href={`/itinerary-builder/${row.itinerary_id || record?.id}`}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      #{row.quote_id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{formatDateTime(row.sent_at)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.client_name}</p>
                    <p className="text-xs text-stone-500">{row.client_email ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium uppercase text-amber-800">
                      {row.delivery_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{row.seen ? "Seen" : "Unseen"}</td>
                  <td className="px-4 py-3">{row.send_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1">
                      {record && (
                        <SendItineraryEmailButton record={record} onSent={refresh} />
                      )}
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700"
                        title="Resend"
                        onClick={() => {
                          if (row.message_id) resendMessage(row.message_id);
                          show(`Resent ${row.quote_id}`);
                          refresh();
                        }}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`Re: ${row.quote_id}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"
                        title="WhatsApp"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </a>
                      {record && (
                        <>
                          <Link
                            href={`/itinerary-builder/${record.id}/quotation`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700"
                            title="Download"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Link>
                          <Link
                            href={`/itinerary-builder/${record.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-700"
                            title="Edit"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Link>
                          <Link
                            href={`/itinerary-builder/${record.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700"
                            title="View"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
