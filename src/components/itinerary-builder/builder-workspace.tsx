"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { VersionTimelinePanel } from "@/components/itinerary-builder/version-timeline-panel";
import { WorkflowStatusBadge } from "@/components/itinerary-builder/workflow-status-badge";
import { PricingAuditPanel } from "@/components/itinerary-builder/pricing-audit-panel";
import { V1BuilderForm } from "@/components/itinerary-builder/v1-builder-form";
import { applyCostToSnapshot } from "@/lib/itinerary-builder/cost-engine";
import { normalizeSnapshot } from "@/lib/itinerary-builder/normalize";
import {
  getClientItinerary,
  getRevisions,
  rollbackToRevision,
  saveSnapshotRevision,
  updateWorkflowStatus,
} from "@/lib/itinerary-builder/storage";
import type {
  ClientItineraryRecord,
  ItineraryRevision,
  ItinerarySnapshot,
  WorkflowStatus,
} from "@/types/itinerary-builder";
import { WORKFLOW_LABELS, WORKFLOW_PIPELINE, CLIENT_TITLES } from "@/types/itinerary-builder";
import { logGeneratedDocument } from "@/lib/itinerary-builder/documents";
import { ShareLinkModal } from "@/components/itinerary-builder/share-link-modal";
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  GitBranch,
  History,
  IndianRupee,
  Save,
  Share2,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function ItineraryBuilderWorkspace({
  itineraryId,
  initialRecord,
  initialRevisions,
}: {
  itineraryId: string;
  initialRecord: ClientItineraryRecord;
  initialRevisions: ItineraryRevision[];
}) {
  const router = useRouter();
  const { show } = useToast();
  const [record, setRecord] = useState(initialRecord);
  const [revisions, setRevisions] = useState(initialRevisions);
  const [snapshot, setSnapshot] = useState<ItinerarySnapshot>(() =>
    normalizeSnapshot(
      initialRevisions.find((r) => r.id === initialRecord.current_revision_id)?.snapshot ??
        initialRevisions[0]?.snapshot
    )
  );
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [clientPanelOpen, setClientPanelOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [pricingAuditOpen, setPricingAuditOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  const refresh = useCallback(() => {
    const r = getClientItinerary(itineraryId);
    const revs = getRevisions(itineraryId);
    if (r) setRecord(r);
    setRevisions(revs);
    const current = revs.find((rev) => rev.id === r?.current_revision_id) ?? revs[0];
    if (current) setSnapshot(normalizeSnapshot(current.snapshot));
  }, [itineraryId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function updateSnapshot(next: ItinerarySnapshot) {
    setSnapshot(applyCostToSnapshot(normalizeSnapshot(next)));
    setDirty(true);
  }

  function handleSave(milestone?: string): ClientItineraryRecord | null {
    const result = saveSnapshotRevision(itineraryId, snapshot, {
      save_type: "manual",
      milestone_label: milestone ?? null,
    });
    if (!result) {
      show("Failed to save");
      return null;
    }
    setRecord(result.record);
    setRevisions(getRevisions(itineraryId));
    setSnapshot(result.revision.snapshot);
    setDirty(false);
    show(`Saved version ${result.revision.version_number}`);
    return result.record;
  }

  function handleRollback(revisionId: string) {
    const result = rollbackToRevision(itineraryId, revisionId);
    if (!result) {
      show("Rollback failed");
      return;
    }
    refresh();
    setDirty(false);
    setVersionsOpen(false);
    show(`Restored as v${result.revision.version_number}`);
  }

  function advanceWorkflow() {
    const idx = WORKFLOW_PIPELINE.indexOf(record.workflow_status);
    if (idx < 0 || idx >= WORKFLOW_PIPELINE.length - 1) return;
    const next = WORKFLOW_PIPELINE[idx + 1];
    if (dirty) handleSave(`Moved to ${WORKFLOW_LABELS[next]}`);
    const updated = updateWorkflowStatus(itineraryId, next);
    if (updated) {
      setRecord(updated);
      show(`Status → ${WORKFLOW_LABELS[next]}`);
    }
  }

  async function createShareLink(options: { pin: string | null }) {
    let currentRecord = record;
    let currentRevisionId = record.current_revision_id;
    let currentVersion = record.current_version;
    let currentSnapshot = snapshot;

    if (dirty) {
      const saved = handleSave("Shared with client");
      if (!saved) return null;
      currentRecord = saved;
      const revs = getRevisions(itineraryId);
      const rev = revs[revs.length - 1];
      if (rev) {
        currentRevisionId = rev.id;
        currentVersion = rev.version_number;
        currentSnapshot = rev.snapshot;
      }
    }

    const res = await fetch("/api/itinerary-builder/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itinerary_id: itineraryId,
        revision_id: currentRevisionId,
        quote_id: currentRecord.quote_id,
        version_number: currentVersion,
        snapshot: currentSnapshot,
        client_name: currentSnapshot.client.client_name,
        pin: options.pin,
      }),
    });

    if (!res.ok) return null;
    const json = await res.json();
    updateWorkflowStatus(itineraryId, "client_shared");
    setRecord((r) => ({ ...r, workflow_status: "client_shared" }));
    return json.url as string;
  }

  function openQuotation() {
    if (dirty) {
      const saved = handleSave("Quotation generated");
      if (!saved) return;
    }
    logGeneratedDocument({
      itinerary_id: itineraryId,
      revision_id: record.current_revision_id,
      quote_id: record.quote_id,
      version_number: record.current_version,
      type: "quotation",
    });
    window.open(`/itinerary-builder/${itineraryId}/quotation`, "_blank");
  }

  function saveAndPreview() {
    const saved = handleSave("Preview & confirm");
    if (!saved) return;
    router.push(`/itinerary-builder/${itineraryId}/preview-confirm`);
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <div className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <Link
            href="/itinerary-builder"
            className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Pipeline
          </Link>
          <ChevronRight className="h-4 w-4 text-stone-300" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-amber-900">{record.quote_id}</span>
              <WorkflowStatusBadge status={record.workflow_status} />
              <span className="flex items-center gap-1 text-xs text-stone-500">
                <GitBranch className="h-3 w-3" />v{record.current_version}
                {dirty && <span className="text-amber-600">· unsaved</span>}
              </span>
            </div>
            <p className="mt-0.5 truncate text-sm font-medium text-stone-800">
              {snapshot.header.title}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={record.workflow_status}
              onChange={(e) => {
                const s = e.target.value as WorkflowStatus;
                if (dirty) handleSave();
                const u = updateWorkflowStatus(itineraryId, s);
                if (u) setRecord(u);
              }}
              className="h-9 w-40 text-xs"
            >
              {WORKFLOW_PIPELINE.map((s) => (
                <option key={s} value={s}>
                  {WORKFLOW_LABELS[s]}
                </option>
              ))}
            </Select>
            <Button type="button" variant="outline" size="sm" onClick={() => setClientPanelOpen(true)}>
              Client
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setVersionsOpen(true)}>
              <History className="h-4 w-4" />
              Versions
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setPricingAuditOpen(true)}>
              <IndianRupee className="h-4 w-4" />
              Pricing log
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setShareOpen(true)}>
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={openQuotation}>
              <FileText className="h-4 w-4" />
              Quotation PDF
            </Button>
            <Button type="button" size="sm" onClick={() => handleSave()}>
              <Save className="h-4 w-4" />
              Save
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={advanceWorkflow}>
              Next stage
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 lg:px-6">
        <V1BuilderForm
          snapshot={snapshot}
          onChange={updateSnapshot}
          onSave={() => {
            handleSave();
            router.push("/itinerary-builder");
          }}
          onPreview={saveAndPreview}
          onAddNote={() => {
            const note = window.prompt("Add internal note");
            if (note != null) {
              updateSnapshot({
                ...snapshot,
                internal_notes: snapshot.internal_notes
                  ? `${snapshot.internal_notes}\n${note}`
                  : note,
              });
            }
          }}
          saveLabel="Save Itinerary"
        />
      </div>

      <Sheet open={versionsOpen} onClose={() => setVersionsOpen(false)} title="Version timeline">
        <VersionTimelinePanel
          revisions={revisions}
          currentRevisionId={record.current_revision_id}
          onRollback={handleRollback}
        />
      </Sheet>

      <Sheet open={clientPanelOpen} onClose={() => setClientPanelOpen(false)} title="Client details">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Title</Label>
              <Select
                value={snapshot.client.title}
                onChange={(e) =>
                  updateSnapshot({
                    ...snapshot,
                    client: { ...snapshot.client, title: e.target.value },
                  })
                }
                className="mt-1.5"
              >
                {CLIENT_TITLES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Client name</Label>
              <Input
                value={snapshot.client.client_name}
                onChange={(e) =>
                  updateSnapshot({
                    ...snapshot,
                    client: { ...snapshot.client, client_name: e.target.value },
                  })
                }
                className="mt-1.5"
              />
            </div>
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={snapshot.client.email ?? ""}
              onChange={(e) =>
                updateSnapshot({
                  ...snapshot,
                  client: { ...snapshot.client, email: e.target.value || null },
                })
              }
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              value={snapshot.client.phone ?? ""}
              onChange={(e) =>
                updateSnapshot({
                  ...snapshot,
                  client: { ...snapshot.client, phone: e.target.value || null },
                })
              }
              className="mt-1.5"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Adults</Label>
              <Input
                type="number"
                min={1}
                value={snapshot.client.adults}
                onChange={(e) =>
                  updateSnapshot({
                    ...snapshot,
                    client: { ...snapshot.client, adults: Number(e.target.value) || 1 },
                  })
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Rooms</Label>
              <Input
                type="number"
                min={1}
                value={snapshot.client.rooms}
                onChange={(e) =>
                  updateSnapshot({
                    ...snapshot,
                    client: { ...snapshot.client, rooms: Number(e.target.value) || 1 },
                  })
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Travel date</Label>
              <Input
                type="date"
                value={snapshot.client.travel_date ?? ""}
                onChange={(e) =>
                  updateSnapshot({
                    ...snapshot,
                    client: { ...snapshot.client, travel_date: e.target.value || null },
                  })
                }
                className="mt-1.5"
              />
            </div>
          </div>
          <Button
            type="button"
            className="w-full"
            onClick={() => {
              handleSave();
              setClientPanelOpen(false);
            }}
          >
            Save client details
          </Button>
        </div>
      </Sheet>

      <Sheet open={pricingAuditOpen} onClose={() => setPricingAuditOpen(false)} title="Pricing change log">
        <PricingAuditPanel itineraryId={itineraryId} />
      </Sheet>

      <ShareLinkModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        onCreate={createShareLink}
        quoteId={record.quote_id}
        versionNumber={record.current_version}
      />
    </div>
  );
}
