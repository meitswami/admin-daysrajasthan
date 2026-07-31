"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { CLIENT_TITLES, type ClientDetails, type HotelCategoryKey, type ItinerarySnapshot } from "@/types/itinerary-builder";
import {
  catalogFromMasterItineraries,
  filterPackages,
  getPackageById,
  uniqueDurations,
  buildCategoryPricing,
  type PackageCatalogEntry,
} from "@/lib/itinerary-builder/package-catalog";
import { listMasterItineraries } from "@/lib/master-data/itinerary-store";
import { createClientItineraryFromWizard } from "@/lib/itinerary-builder/storage";
import { normalizeSnapshot } from "@/lib/itinerary-builder/normalize";
import { emptySnapshot } from "@/lib/itinerary-builder/defaults";
import { durationLabelFromDays, lastDayDepartureError } from "@/lib/itinerary-builder/cost-engine";
import { todayIsoDate, travelDateValidationError } from "@/lib/itinerary-builder/travel-date";
import { clampAdvancePercent } from "@/lib/itinerary-builder/payment-details";
import { loadSiteSettings } from "@/lib/site-settings/storage";
import { V1BuilderForm } from "@/components/itinerary-builder/v1-builder-form";
import { cn } from "@/lib/utils";
import { Check, ChevronLeft, ChevronRight, Search, Wand2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useSystem } from "@/components/providers/system-provider";

const STEPS = ["Client Details", "Select Itinerary", "Itinerary Builder"] as const;

export function NewItineraryWizard() {
  const router = useRouter();
  const { show } = useToast();
  const { currentMember } = useSystem();
  const [step, setStep] = useState(0);
  const [durationFilter, setDurationFilter] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [tourCodeFilter, setTourCodeFilter] = useState("");
  const [client, setClient] = useState<ClientDetails>({
    title: "Mr",
    client_name: "",
    email: null,
    email2: null,
    phone: null,
    adults: 2,
    children_5_12: 0,
    children_below_5: 0,
    rooms: 1,
    extra_beds: 0,
    travel_date: null,
    food_preference: null,
    special_requests: null,
  });
  const [packageId, setPackageId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ItinerarySnapshot | null>(null);
  const [catalog, setCatalog] = useState<PackageCatalogEntry[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    void listMasterItineraries()
      .then((items) => {
        if (cancelled) return;
        setCatalog(catalogFromMasterItineraries(items, { includeInactive: true }));
      })
      .catch(() => {
        if (!cancelled) setCatalog([]);
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (packageId && !getPackageById(packageId, catalog)) {
      setPackageId(null);
    }
  }, [catalog, packageId]);

  const packages = useMemo(
    () =>
      filterPackages(
        {
          search,
          durationNights: durationFilter,
          tourCode: tourCodeFilter,
        },
        catalog
      ),
    [search, durationFilter, tourCodeFilter, catalog]
  );

  const selectedPackage = packageId ? getPackageById(packageId, catalog) : null;

  function buildDraftFromPackage(
    pkgId: string | null,
    opts?: { preserveClient?: ClientDetails; preserveTourCode?: string | null }
  ): ItinerarySnapshot {
    const pkg = pkgId ? getPackageById(pkgId, catalog) : null;
    const base = pkg ? pkg.buildTemplate() : emptySnapshot();
    const category_pricing = buildCategoryPricing(base, ["deluxe_hotels"], {}, {});
    const defaultAdvance = clampAdvancePercent(
      loadSiteSettings().adminGeneral.default_advance_percent
    );
    const clientDetails = opts?.preserveClient ?? client;
    // Leave tour code blank — staff enter a WRT… code. Tip shows last number in the form.
    const tourCode =
      opts?.preserveTourCode !== undefined ? opts.preserveTourCode : null;
    return normalizeSnapshot({
      ...base,
      client: { ...base.client, ...clientDetails },
      header: {
        ...base.header,
        title: pkg?.title || base.header.title || `Quote for ${clientDetails.client_name}`,
        tour_code: tourCode,
        duration_label: durationLabelFromDays(base.days),
        alternate_titles: base.header.alternate_titles?.length
          ? base.header.alternate_titles
          : [],
      },
      category_pricing,
      source_package_id: pkgId,
      vehicle_type: null,
      price_basis: "whole_group",
      final_price: category_pricing[0]?.grand_total ?? null,
      optional_inclusion_keys: [],
      advance_percent: defaultAdvance,
    });
  }

  function selectPackage(id: string) {
    setPackageId(id);
    // Same package selected again → keep draft & tour code; only rebuild when package changes.
    if (draft && draft.source_package_id === id) {
      setDraft((d) =>
        d
          ? normalizeSnapshot({
              ...d,
              client: { ...d.client, ...client },
            })
          : d
      );
      setStep(2);
      return;
    }
    setDraft(buildDraftFromPackage(id));
    setStep(2);
  }

  /** Switch package from Step 3 title picker — updates tour code only when package id changes. */
  function applyPackageSelection(nextPackageId: string) {
    const pkg = getPackageById(nextPackageId, catalog);
    if (!pkg || !draft) return;
    if (draft.source_package_id === nextPackageId) {
      // Same pre-existing itinerary — keep current tour code (and draft).
      return;
    }
    const prevKeys = draft.category_pricing.map((c) => c.category_key);
    const prevDiscounts = Object.fromEntries(
      draft.category_pricing.map((c) => [c.category_key, c.discount_price])
    );
    const prevOverrides = Object.fromEntries(
      draft.category_pricing.map((c) => [c.category_key, c.manual_override])
    );
    setPackageId(nextPackageId);
    const next = buildDraftFromPackage(nextPackageId, {
      preserveClient: draft.client,
    });
    const keys: HotelCategoryKey[] = (
      prevKeys.length ? prevKeys : (["deluxe_hotels"] as HotelCategoryKey[])
    ).slice(0, 2);
    const category_pricing = buildCategoryPricing(next, keys, prevDiscounts, prevOverrides);
    setDraft(
      normalizeSnapshot({
        ...next,
        category_pricing,
        final_price: category_pricing[0]?.grand_total ?? null,
      })
    );
  }

  function validateClient(): boolean {
    if (!client.client_name.trim()) {
      show("Client name is required");
      return false;
    }
    if (!client.phone?.trim()) {
      show("Phone number is required");
      return false;
    }
    const travelErr = travelDateValidationError(client.travel_date);
    if (travelErr) {
      show(travelErr);
      return false;
    }
    return true;
  }

  function next() {
    if (step === 0) {
      if (!validateClient()) return;
      setStep(1);
      return;
    }
    if (step === 1) {
      if (!packageId) {
        show("Select a tour package or use Create Custom");
        return;
      }
      selectPackage(packageId);
    }
  }

  function persistDraft(after: "list" | "preview") {
    if (!draft) return;
    if (!draft.client.client_name.trim()) {
      show("Customer name is required");
      return;
    }
    if (!draft.client.phone?.trim()) {
      show("Phone number is required");
      return;
    }
    if (!draft.header.title.trim()) {
      show("Itinerary title is required");
      return;
    }
    if (!draft.client.travel_date?.trim()) {
      show("Travel date is required");
      return;
    }
    const travelErr = travelDateValidationError(draft.client.travel_date);
    if (travelErr) {
      show(travelErr);
      return;
    }
    if (draft.category_pricing.length === 0) {
      show("Select at least one hotel category");
      return;
    }
    const departureErr = lastDayDepartureError(draft.days);
    if (departureErr) {
      show(departureErr);
      return;
    }

    try {
      const record = createClientItineraryFromWizard({
        client: draft.client,
        packageId: draft.source_package_id,
        categoryKeys: draft.category_pricing.map((c) => c.category_key),
        categoryDiscounts: Object.fromEntries(
          draft.category_pricing.map((c) => [c.category_key, c.discount_price])
        ),
        packagePriceOverrides: Object.fromEntries(
          draft.category_pricing.map((c) => [c.category_key, c.manual_override])
        ),
        title: draft.header.title,
        tourCode: draft.header.tour_code,
        alternateTitles: draft.header.alternate_titles,
        days: draft.days,
        vehicle_type: draft.vehicle_type,
        price_basis: draft.price_basis,
        final_price: draft.final_price,
        optional_inclusion_keys: draft.optional_inclusion_keys,
        inclusions: draft.inclusions,
        internal_notes: draft.internal_notes,
        public_notes: draft.public_notes,
        category_pricing: draft.category_pricing,
        created_by: currentMember.name,
        owner_name: currentMember.name,
      });

      show(`Saved ${record.quote_id}`);
      if (after === "preview") {
        router.push(`/itinerary-builder/${record.id}/preview-confirm`);
      } else {
        router.push("/itinerary-builder");
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not save itinerary — browser storage may be full.";
      show(message);
    }
  }

  function createCustom() {
    if (!validateClient()) {
      setStep(0);
      return;
    }
    setPackageId(null);
    setDraft(buildDraftFromPackage(null));
    setStep(2);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {step < 2 && (
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-white sm:px-6">
          <p className="font-medium">
            {STEPS[step]} · Step {step + 1} of 3
          </p>
        </div>
      )}

      {step === 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-stone-900">1 Client Details</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Client Name *</Label>
              <div className="mt-1.5 flex gap-2">
                <Select
                  value={client.title}
                  onChange={(e) => setClient((c) => ({ ...c, title: e.target.value }))}
                  className="w-28 shrink-0"
                >
                  {CLIENT_TITLES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
                <Input
                  value={client.client_name}
                  onChange={(e) => setClient((c) => ({ ...c, client_name: e.target.value }))}
                  placeholder="Enter client name"
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                value={client.email ?? ""}
                onChange={(e) => setClient((c) => ({ ...c, email: e.target.value || null }))}
                placeholder="Enter email address"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Email Address 2 (Optional)</Label>
              <Input
                type="email"
                value={client.email2 ?? ""}
                onChange={(e) => setClient((c) => ({ ...c, email2: e.target.value || null }))}
                placeholder="Enter second email address"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Phone Number *</Label>
              <Input
                type="tel"
                required
                value={client.phone ?? ""}
                onChange={(e) => setClient((c) => ({ ...c, phone: e.target.value || null }))}
                placeholder="Enter phone number"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Number of Adults</Label>
              <Input
                type="number"
                min={1}
                value={client.adults}
                onChange={(e) =>
                  setClient((c) => ({ ...c, adults: Number(e.target.value) || 1 }))
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Kids (5–12 Years)</Label>
              <Input
                type="number"
                min={0}
                value={client.children_5_12}
                onChange={(e) =>
                  setClient((c) => ({ ...c, children_5_12: Number(e.target.value) || 0 }))
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Kids (Below 5 Years)</Label>
              <Input
                type="number"
                min={0}
                value={client.children_below_5}
                onChange={(e) =>
                  setClient((c) => ({ ...c, children_below_5: Number(e.target.value) || 0 }))
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Number of Rooms</Label>
              <Input
                type="number"
                min={1}
                value={client.rooms}
                onChange={(e) =>
                  setClient((c) => ({ ...c, rooms: Number(e.target.value) || 1 }))
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Extra mattress</Label>
              <Input
                type="number"
                min={0}
                value={client.extra_beds}
                onChange={(e) =>
                  setClient((c) => ({ ...c, extra_beds: Number(e.target.value) || 0 }))
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Travel Date *</Label>
              <Input
                type="date"
                required
                min={todayIsoDate()}
                value={client.travel_date ?? ""}
                onChange={(e) =>
                  setClient((c) => ({ ...c, travel_date: e.target.value || null }))
                }
                className="mt-1.5"
              />
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-stone-700">
            <p className="font-semibold text-stone-900">
              Customer: {[client.title, client.client_name].filter(Boolean).join(" ") || "—"}
            </p>
            <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-stone-600">
              <span>Phone: {client.phone?.trim() || "—"}</span>
              {client.email?.trim() ? <span>Email: {client.email}</span> : null}
              {client.email2?.trim() ? <span>Email 2: {client.email2}</span> : null}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={String(durationFilter)}
              onChange={(e) => {
                const v = e.target.value;
                setDurationFilter(v === "all" ? "all" : Number(v));
              }}
              className="w-44"
            >
              <option value="all">All Durations</option>
              {uniqueDurations(catalog).map((n) => (
                <option key={n} value={n}>
                  {n} Night{n !== 1 ? "s" : ""}
                </option>
              ))}
            </Select>
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input
                placeholder="Search by title or location…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="button" variant="outline" onClick={createCustom}>
              <Wand2 className="h-4 w-4" />
              Create Custom Itinerary
            </Button>
          </div>

          {catalogLoading ? (
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
              Loading packages from Master Data…
            </div>
          ) : selectedPackage ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <Check className="h-4 w-4 shrink-0" />
              <span className="font-medium">{selectedPackage.title}</span>
              <span className="text-emerald-700">· Duration: {selectedPackage.duration_label}</span>
            </div>
          ) : (
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
              No package selected yet
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <div className="border-b border-stone-100 px-4 py-2">
              <Input
                placeholder="Filter by Tour Code"
                value={tourCodeFilter}
                onChange={(e) => setTourCodeFilter(e.target.value)}
                className="max-w-xs"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
                  <tr>
                    <th className="px-4 py-3">Tour Code</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3 hidden md:table-cell">Locations</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {!catalogLoading && packages.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-stone-500">
                        No packages found. Add itineraries in Master Data → Itineraries,
                        or use Create Custom Itinerary.
                      </td>
                    </tr>
                  ) : (
                    packages.map((pkg) => (
                      <tr
                        key={pkg.id}
                        className={cn(
                          "hover:bg-blue-50/40",
                          packageId === pkg.id && "bg-blue-50/60"
                        )}
                      >
                        <td className="px-4 py-3 font-mono font-medium">{pkg.tour_code}</td>
                        <td className="px-4 py-3 font-medium text-emerald-700">{pkg.duration_label}</td>
                        <td className="px-4 py-3">{pkg.title}</td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {pkg.locations.length ? (
                              pkg.locations.map((loc) => (
                                <span
                                  key={loc.name}
                                  className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800"
                                >
                                  {loc.name} - {loc.nights}N
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-stone-400">No location set</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            type="button"
                            size="sm"
                            variant={packageId === pkg.id ? "default" : "outline"}
                            onClick={() => selectPackage(pkg.id)}
                          >
                            {packageId === pkg.id ? "Selected" : "Select"}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {step === 2 && draft && (
        <V1BuilderForm
          snapshot={draft}
          onChange={setDraft}
          showStepHeader
          packageCatalog={catalog}
          onSelectPackage={applyPackageSelection}
          onBack={() => {
            setClient(draft.client);
            setStep(1);
          }}
          onSave={() => persistDraft("list")}
          onPreview={() => persistDraft("preview")}
          onAddNote={() => {
            const note = window.prompt("Add internal note");
            if (note != null) {
              setDraft((d) =>
                d
                  ? {
                      ...d,
                      internal_notes: d.internal_notes
                        ? `${d.internal_notes}\n${note}`
                        : note,
                    }
                  : d
              );
            }
          }}
          saveLabel="Save New Itinerary"
          saveRequiresChanges
        />
      )}

      {step < 2 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <Button type="button" onClick={next}>
            Continue
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
