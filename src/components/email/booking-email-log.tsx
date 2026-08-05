"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  getBookingEmailLogs,
  getEmailStats,
  resendMessage,
} from "@/lib/email/storage";
import { listClientItineraries } from "@/lib/itinerary-builder/storage";
import { SendItineraryEmailButton } from "@/components/email/send-itinerary-email-button";
import type { BookingEmailLogEntry } from "@/types/team-email";
import { formatDateTime } from "@/lib/utils";
import { RefreshCw, MessageCircle, Eye } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function BookingEmailLog() {
  const { show } = useToast();
  const [stats, setStats] = useState({
    totalEmails: 0,
    totalSends: 0,
    pending: 0,
    seen: 0,
    unseen: 0,
    inboxUnread: 0,
  });
  const [logs, setLogs] = useState<BookingEmailLogEntry[]>([]);

  const refresh = useCallback(async () => {
    try {
      const [nextStats, stored] = await Promise.all([getEmailStats(), getBookingEmailLogs()]);
      setStats(nextStats);
      if (stored.length > 0) {
        setLogs(stored);
        return;
      }
      // No emails yet — show booking stubs so staff can still send
      setLogs(
        listClientItineraries().map((r) => ({
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
        }))
      );
    } catch (err) {
      show(err instanceof Error ? err.message : "Failed to load email logs");
    }
  }, [show]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const records = listClientItineraries();
  const recordByQuote = Object.fromEntries(records.map((r) => [r.quote_id, r]));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(
          [
            ["Total Emails", stats.totalEmails],
            ["Total Sends", stats.totalSends],
            ["Pending", stats.pending],
            ["Seen", stats.seen],
            ["Unseen", stats.unseen],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
            <p className="text-xs text-blue-700">{label}</p>
            <p className="text-xl font-bold text-blue-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
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
            {logs.map((log) => {
              const record = recordByQuote[log.quote_id];
              return (
                <tr key={log.id} className="hover:bg-stone-50/80">
                  <td className="px-4 py-3 font-medium text-amber-900">{log.quote_id}</td>
                  <td className="px-4 py-3 text-xs text-stone-500">{formatDateTime(log.sent_at)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{log.client_name}</p>
                    <p className="text-xs text-stone-500">{log.client_email}</p>
                  </td>
                  <td className="px-4 py-3 capitalize">{log.delivery_status}</td>
                  <td className="px-4 py-3">{log.seen ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">{log.send_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {record && <SendItineraryEmailButton record={record} />}
                      {log.message_id !== log.itinerary_id && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void resendMessage(log.message_id).then(() => {
                              show("Resent");
                              void refresh();
                            })
                          }
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Resend
                        </Button>
                      )}
                      {record && (
                        <Link
                          href={`/itinerary-builder/${record.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2 py-1 text-xs hover:bg-stone-50"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Open
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {logs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-stone-500">
                  No email activity yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
