"use client";

import { Button } from "@/components/ui/button";
import type { ItineraryRevision } from "@/types/itinerary-builder";
import { formatDateTime } from "@/lib/utils";
import { GitBranch, RotateCcw } from "lucide-react";

export function VersionTimelinePanel({
  revisions,
  currentRevisionId,
  onRollback,
}: {
  revisions: ItineraryRevision[];
  currentRevisionId: string;
  onRollback: (revisionId: string) => void;
}) {
  if (!revisions.length) {
    return <p className="text-sm text-stone-500">No revisions yet.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-stone-500">
        Immutable revision history — rollback creates a new version without deleting history.
      </p>
      <ol className="relative space-y-4 border-l-2 border-amber-200 pl-4">
        {revisions.map((rev) => {
          const isCurrent = rev.id === currentRevisionId;
          return (
            <li key={rev.id} className="relative">
              <span
                className={`absolute -left-[1.35rem] top-1 h-3 w-3 rounded-full ring-2 ring-white ${
                  isCurrent ? "bg-amber-500" : "bg-stone-300"
                }`}
              />
              <div className="rounded-xl border border-stone-100 bg-stone-50/80 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-stone-900">
                      Version {rev.version_number}
                      {isCurrent && (
                        <span className="ml-2 text-xs font-normal text-amber-700">Current</span>
                      )}
                    </p>
                    {rev.milestone_label && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-800">
                        <GitBranch className="h-3 w-3" />
                        {rev.milestone_label}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-stone-500">
                      {rev.created_by} · {formatDateTime(rev.created_at)} · {rev.save_type}
                    </p>
                  </div>
                  {!isCurrent && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => onRollback(rev.id)}
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Restore
                    </Button>
                  )}
                </div>
                {rev.change_summary && (
                  <p className="mt-2 text-xs leading-relaxed text-stone-600">{rev.change_summary}</p>
                )}
                <p className="mt-2 text-xs font-medium text-stone-800">
                  {rev.snapshot.cost_sheet.currency}{" "}
                  {rev.snapshot.cost_sheet.grand_total.toLocaleString("en-IN")}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
