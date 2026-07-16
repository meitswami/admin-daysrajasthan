"use client";

import { formatDateTime } from "@/lib/utils";
import { formatInr } from "@/lib/itinerary-builder/cost-engine";
import {
  getPricingLogsForItinerary,
  listAllPricingLogs,
  type PricingChangeLogEntry,
} from "@/lib/itinerary-builder/pricing-log";

function LogTable({ logs }: { logs: PricingChangeLogEntry[] }) {
  if (logs.length === 0) {
    return <p className="text-sm text-stone-500">No pricing changes recorded yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="text-left text-xs uppercase text-stone-500">
          <tr>
            <th className="pb-2 pr-3">When</th>
            <th className="pb-2 pr-3">Field</th>
            <th className="pb-2 pr-3">Old</th>
            <th className="pb-2 pr-3">New</th>
            <th className="pb-2 pr-3">By</th>
            <th className="pb-2">Note</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {logs.map((log, index) => (
            <tr key={`${log.id}-${index}`}>
              <td className="py-2 pr-3 whitespace-nowrap text-xs text-stone-500">
                {formatDateTime(log.changed_at)}
              </td>
              <td className="py-2 pr-3 font-mono text-xs">{log.field}</td>
              <td className="py-2 pr-3 tabular-nums">
                {log.old_value != null ? formatInr(log.old_value) : "—"}
              </td>
              <td className="py-2 pr-3 tabular-nums font-medium text-amber-800">
                {log.new_value != null ? formatInr(log.new_value) : "—"}
              </td>
              <td className="py-2 pr-3 text-xs">{log.changed_by}</td>
              <td className="py-2 text-xs text-stone-500">{log.note ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PricingAuditPanel({ itineraryId }: { itineraryId: string }) {
  const logs = getPricingLogsForItinerary(itineraryId);
  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-600">
        Every manual override and tier price change is logged with timestamp and staff member.
      </p>
      <LogTable logs={logs} />
    </div>
  );
}

export function GlobalPricingAuditPanel() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-600">Recent pricing changes across all client quotes.</p>
      <LogTable logs={listAllPricingLogs(50)} />
    </div>
  );
}
