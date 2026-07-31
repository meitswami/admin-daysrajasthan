"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { WorkflowStatusBadge } from "@/components/itinerary-builder/workflow-status-badge";
import { V1BuilderForm } from "@/components/itinerary-builder/v1-builder-form";
import { applyCostToSnapshot, durationLabelFromDays, lastDayDepartureError } from "@/lib/itinerary-builder/cost-engine";
import { todayIsoDate, travelDateValidationError } from "@/lib/itinerary-builder/travel-date";
import { normalizeSnapshot } from "@/lib/itinerary-builder/normalize";
import {
  buildCategoryPricing,
  catalogFromMasterItineraries,
  getPackageById,
  type PackageCatalogEntry,
} from "@/lib/itinerary-builder/package-catalog";
import { listMasterItineraries } from "@/lib/master-data/itinerary-store";
import {
  getClientItinerary,
  getRevisions,
  saveSnapshotRevision,
} from "@/lib/itinerary-builder/storage";
import type {
  ClientItineraryRecord,
  HotelCategoryKey,
  ItineraryRevision,
  ItinerarySnapshot,
} from "@/types/itinerary-builder";
import { CLIENT_TITLES } from "@/types/itinerary-builder";
import { ArrowLeft, ChevronRight } from "lucide-react";
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
  const [snapshot, setSnapshot] = useState<ItinerarySnapshot>(() =>
    normalizeSnapshot(
      initialRevisions.find((r) => r.id === initialRecord.current_revision_id)?.snapshot ??
        initialRevisions[0]?.snapshot
    )
  );
  const [clientPanelOpen, setClientPanelOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [packageCatalog, setPackageCatalog] = useState<PackageCatalogEntry[]>([]);

  const refresh = useCallback(() => {
    const r = getClientItinerary(itineraryId);
    const revs = getRevisions(itineraryId);
    if (r) setRecord(r);
    const current = revs.find((rev) => rev.id === r?.current_revision_id) ?? revs[0];
    if (current) setSnapshot(normalizeSnapshot(current.snapshot));
  }, [itineraryId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    void listMasterItineraries()
      .then((items) => {
        if (!cancelled) {
          setPackageCatalog(catalogFromMasterItineraries(items, { includeInactive: true }));
        }
      })
      .catch(() => {
        if (!cancelled) setPackageCatalog([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function updateSnapshot(next: ItinerarySnapshot) {
    setSnapshot(applyCostToSnapshot(normalizeSnapshot(next)));
    setDirty(true);
  }

  /** Tour code updates only when a different pre-existing package is selected. */
  function applyPackageSelection(nextPackageId: string) {
    const pkg = getPackageById(nextPackageId, packageCatalog);
    if (!pkg) return;
    if (snapshot.source_package_id === nextPackageId) return;

    const template = pkg.buildTemplate();
    const prevKeys = snapshot.category_pricing.map((c) => c.category_key);
    const prevDiscounts = Object.fromEntries(
      snapshot.category_pricing.map((c) => [c.category_key, c.discount_price])
    );
    const prevOverrides = Object.fromEntries(
      snapshot.category_pricing.map((c) => [c.category_key, c.manual_override])
    );
    const keys: HotelCategoryKey[] = (
      prevKeys.length ? prevKeys : (["deluxe_hotels"] as HotelCategoryKey[])
    ).slice(0, 2);
    const merged = normalizeSnapshot({
      ...template,
      client: snapshot.client,
      header: {
        ...template.header,
        title: pkg.title,
        // Keep existing quote tour code (or blank) — do not copy package master code.
        tour_code: snapshot.header.tour_code,
        duration_label: durationLabelFromDays(template.days),
        alternate_titles: template.header.alternate_titles ?? [],
      },
      source_package_id: nextPackageId,
      vehicle_type: snapshot.vehicle_type,
      vehicle_types: snapshot.vehicle_types,
      price_basis: snapshot.price_basis,
      optional_inclusion_keys: snapshot.optional_inclusion_keys,
      advance_percent: snapshot.advance_percent,
    });
    const category_pricing = buildCategoryPricing(
      merged,
      keys,
      prevDiscounts,
      prevOverrides
    );
    updateSnapshot({
      ...merged,
      category_pricing,
      final_price: category_pricing[0]?.grand_total ?? null,
    });
  }

  function handleSave(milestone?: string): ClientItineraryRecord | null {
    const travelErr = travelDateValidationError(snapshot.client.travel_date);
    if (travelErr) {
      show(travelErr);
      return null;
    }
    const departureErr = lastDayDepartureError(snapshot.days);
    if (departureErr) {
      show(departureErr);
      return null;
    }
    try {
      const result = saveSnapshotRevision(itineraryId, snapshot, {
        save_type: "manual",
        milestone_label: milestone ?? null,
      });
      if (!result) {
        show("Failed to save");
        return null;
      }
      setRecord(result.record);
      setSnapshot(result.revision.snapshot);
      setDirty(false);
      show(`Saved version ${result.revision.version_number}`);
      return result.record;
    } catch (err) {
      show(
        err instanceof Error
          ? err.message
          : "Could not save — browser storage may be full."
      );
      return null;
    }
  }

  function saveAndPreview() {
    const saved = handleSave("Preview & confirm");
    if (!saved) return;
    router.push(`/itinerary-builder/${itineraryId}/preview-confirm`);
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <div className="sticky top-0 z-30 border-b border-stone-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <Link
            href="/itinerary-builder"
            className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <ChevronRight className="h-4 w-4 text-stone-300" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-amber-900">{record.quote_id}</span>
              <WorkflowStatusBadge status={record.workflow_status} />
              {dirty && (
                <span className="text-xs text-amber-600">unsaved</span>
              )}
            </div>
            <p className="mt-0.5 truncate text-sm font-medium text-stone-800">
              {snapshot.header.title}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setClientPanelOpen(true)}>
              Client
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 lg:px-6">
        <V1BuilderForm
          snapshot={snapshot}
          onChange={updateSnapshot}
          packageCatalog={packageCatalog}
          onSelectPackage={applyPackageSelection}
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
                min={todayIsoDate()}
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

    </div>
  );
}
