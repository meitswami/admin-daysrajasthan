"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageMain, PageToolbar } from "@/components/ui/data-table";
import { ItineraryListTable } from "@/components/itinerary-builder/itinerary-list-table";
import { formatInr } from "@/lib/itinerary-builder/cost-engine";
import { listClientItineraries } from "@/lib/itinerary-builder/storage";
import type { ClientItineraryRecord, WorkflowStatus } from "@/types/itinerary-builder";
import { WORKFLOW_LABELS, WORKFLOW_PIPELINE } from "@/types/itinerary-builder";
import {
  LayoutGrid,
  List,
  Plus,
  Search,
  GitBranch,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const KANBAN_COLUMNS: WorkflowStatus[] = [
  "draft",
  "sales_review",
  "manager_approval",
  "client_shared",
  "booking_confirmed",
  "completed",
];

export function ItineraryBuilderPipelineView({
  initialRecords,
  title = "Itinerary List",
}: {
  initialRecords: ClientItineraryRecord[];
  title?: string;
}) {
  const [records, setRecords] = useState(initialRecords);
  const [view, setView] = useState<"kanban" | "list">("list");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setRecords(listClientItineraries());
  }, []);

  useEffect(() => {
    void import("@/lib/system/data-mode").then(({ isRealDataMode }) => {
      if (!isRealDataMode()) return;
      void import("@/lib/itinerary-builder/sync-real").then(({ hydrateItineraryBuilderFromSupabaseIfReal }) =>
        hydrateItineraryBuilderFromSupabaseIfReal().then((remote) => setRecords(remote))
      );
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return records.filter(
      (r) =>
        !q ||
        r.quote_id.toLowerCase().includes(q) ||
        r.client_name.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q)
    );
  }, [records, search]);

  function refresh() {
    setRecords(listClientItineraries());
  }

  return (
    <>
      <PageToolbar>
        <div className="relative min-w-[200px] flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input
            placeholder="Search quote ID, client, title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/itinerary-builder/trash"
            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50"
          >
            <Trash2 className="h-4 w-4" />
            View Trash
          </Link>
          <div className="flex rounded-lg border border-stone-200 p-0.5">
            <button
              type="button"
              onClick={() => setView("kanban")}
              className={cn(
                "rounded-md p-2",
                view === "kanban" ? "bg-amber-100 text-amber-900" : "text-stone-500"
              )}
              aria-label="Kanban view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "rounded-md p-2",
                view === "list" ? "bg-amber-100 text-amber-900" : "text-stone-500"
              )}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Link href="/itinerary-builder/new">
            <Button type="button">
              <Plus className="h-4 w-4" />
              New quote
            </Button>
          </Link>
        </div>
      </PageToolbar>

      <PageMain>
        {view === "list" ? (
          <ItineraryListTable records={filtered} onRefresh={refresh} />
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {KANBAN_COLUMNS.map((status) => {
              const cards = filtered.filter((r) => r.workflow_status === status);
              return (
                <div
                  key={status}
                  className="flex w-72 shrink-0 flex-col rounded-2xl border border-stone-200/80 bg-stone-50/50"
                >
                  <div className="border-b border-stone-200 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                      {WORKFLOW_LABELS[status]}
                    </p>
                    <p className="text-lg font-bold text-stone-800">{cards.length}</p>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-2 min-h-[200px]">
                    {cards.map((r) => (
                      <Link
                        key={r.id}
                        href={`/itinerary-builder/${r.id}`}
                        className="block rounded-xl border border-stone-200 bg-white p-3 shadow-sm transition hover:border-amber-300 hover:shadow-md"
                      >
                        <p className="font-semibold text-amber-900">{r.quote_id}</p>
                        <p className="text-sm text-stone-800">{r.client_name}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-stone-500">{r.title}</p>
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 text-stone-500">
                            <GitBranch className="h-3 w-3" />v{r.current_version}
                          </span>
                          <span className="font-medium">{formatInr(r.grand_total)}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-4 text-xs text-stone-500">
          {title} · Workflow: {WORKFLOW_PIPELINE.map((s) => WORKFLOW_LABELS[s]).join(" → ")}
        </p>
      </PageMain>
    </>
  );
}
