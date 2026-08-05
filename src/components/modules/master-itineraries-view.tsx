"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  GalleryImagesField,
  ImageThumbCarousel,
  collectDisplayImages,
} from "@/components/ui/gallery-images-field";
import { RichTextToolbar } from "@/components/ui/rich-text-toolbar";
import { PageMain, PageToolbar, TableRowActions } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import { useSystem } from "@/components/providers/system-provider";
import type { Itinerary, ItineraryDayPlan } from "@/types/database";
import { canCreateMasterData, createdByAttribution } from "@/lib/rbac/ownership";
import {
  createMasterItinerary,
  deleteMasterItinerary,
  listMasterItineraries,
  updateMasterItinerary,
} from "@/lib/master-data/itinerary-store";
import { listMasterContent, updateMasterContent } from "@/lib/master-data/content-store";
import type { WebsiteContentItem } from "@/types/database";
import { Toggle } from "@/components/ui/toggle";
import { Minus, Plus, Search, Trash2 } from "lucide-react";
import {
  compareTourCodesAsc,
  durationMatchesQuery,
} from "@/lib/itinerary-builder/package-catalog";
import { isDepartureLocation } from "@/lib/itinerary-builder/cost-engine";

type StatusFilter = "active" | "inactive" | "all";

const MAX_DAY_LOCATION_IMAGES = 4;

function emptyDay(dayNumber: number): ItineraryDayPlan {
  return {
    day_number: dayNumber,
    title: "",
    alternate_titles: [],
    location: "",
    locations: [],
    description: "",
    image_urls: [],
  };
}

function photosForDestination(dest: WebsiteContentItem | undefined): string[] {
  if (!dest) return [];
  return collectDisplayImages(dest.image_url, dest.gallery_urls, MAX_DAY_LOCATION_IMAGES);
}

function findDestination(
  catalog: WebsiteContentItem[],
  name: string
): WebsiteContentItem | undefined {
  const q = name.trim().toLowerCase();
  if (!q) return undefined;
  return catalog.find((d) => d.name.trim().toLowerCase() === q);
}

function destinationFromDays(days: ItineraryDayPlan[]): string | null {
  const locations = [
    ...new Set(
      days.flatMap((d) =>
        [d.location, ...(d.locations ?? [])]
          .map((l) => l.trim())
          .filter((l) => Boolean(l) && !isDepartureLocation(l))
      )
    ),
  ];
  return locations.length ? locations.join(" · ") : null;
}

/** Prefer stored tour_code; fall back to slug prefix (e.g. dr004-… → DR004) */
function tourCodeOf(item: Itinerary): string {
  if (item.tour_code?.trim()) return item.tour_code.trim().toUpperCase();
  const slug = item.slug?.trim();
  if (!slug) return "—";
  const match = slug.match(/^([a-zA-Z]+\d+)/);
  return (match?.[1] ?? slug.split("-")[0] ?? slug).toUpperCase();
}

/** Locations with night counts from day plan, else destination fallback */
function locationsCountOf(item: Itinerary): string {
  const days = item.days ?? [];
  const segments: { name: string; nights: number }[] = [];
  for (const day of days) {
    const names = [day.location, ...(day.locations ?? [])]
      .map((n) => n.trim())
      .filter((n) => Boolean(n) && !isDepartureLocation(n));
    for (const name of names.length ? [names[0]] : []) {
      const last = segments[segments.length - 1];
      if (last && last.name === name) last.nights += 1;
      else segments.push({ name, nights: 1 });
    }
  }
  if (segments.length) {
    return segments.map((s) => `${s.name} ${s.nights}-N`).join(", ");
  }
  return item.destination?.trim() || "—";
}

function packageDisplayImages(item: Itinerary): string[] {
  const dayUrls = (item.days ?? []).flatMap((d) => d.image_urls ?? []);
  return collectDisplayImages(
    item.cover_image_url,
    [...(item.gallery_urls ?? []), ...dayUrls],
    6,
  );
}

function dayTitleList(day: ItineraryDayPlan): string[] {
  return [day.title, ...(day.alternate_titles ?? [])];
}

function dayLocationList(day: ItineraryDayPlan): string[] {
  const list = [day.location, ...(day.locations ?? [])];
  return list.length ? list : [""];
}

export function MasterItinerariesView() {
  const { show } = useToast();
  const { currentMember, dataMode } = useSystem();
  const [items, setItems] = useState<Itinerary[]>([]);
  const [destinations, setDestinations] = useState<WebsiteContentItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Itinerary | null>(null);

  const [titles, setTitles] = useState<string[]>([""]);
  const [duration, setDuration] = useState("");
  const [tourCode, setTourCode] = useState("");
  const [days, setDays] = useState<ItineraryDayPlan[]>(() => [emptyDay(1)]);

  const canCreate = canCreateMasterData(currentMember);

  const locations = useMemo(
    () =>
      destinations
        .map((d) => d.name.trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [destinations]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    const [packages, destinationRows] = await Promise.all([
      listMasterItineraries(),
      listMasterContent("destinations"),
    ]);
    setItems(packages);
    setDestinations(destinationRows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, dataMode]);

  const inactiveCount = useMemo(
    () => items.filter((i) => i.status !== "active").length,
    [items]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = items.filter((i) => {
      if (statusFilter === "active" && i.status !== "active") return false;
      if (statusFilter === "inactive" && i.status === "active") return false;
      if (!q) return true;
      return (
        i.package_name.toLowerCase().includes(q) ||
        (i.alternate_titles ?? []).some((t) => t.toLowerCase().includes(q)) ||
        (i.destination?.toLowerCase().includes(q) ?? false) ||
        durationMatchesQuery(i.package_duration, q) ||
        tourCodeOf(i).toLowerCase().includes(q) ||
        (i.days ?? []).some(
          (d) =>
            d.location.toLowerCase().includes(q) ||
            d.title.toLowerCase().includes(q) ||
            (d.locations ?? []).some((l) => l.toLowerCase().includes(q))
        )
      );
    });
    return list.sort((a, b) => compareTourCodesAsc(tourCodeOf(a), tourCodeOf(b)));
  }, [items, search, statusFilter]);

  function resetForm() {
    setTitles([""]);
    setDuration("");
    setTourCode("");
    setDays([emptyDay(1)]);
  }

  function openAdd() {
    if (!canCreate) {
      show("You do not have permission to add itineraries");
      return;
    }
    setEditing(null);
    resetForm();
    setModalOpen(true);
  }

  function openEdit(item: Itinerary) {
    setEditing(item);
    setTitles(
      [item.package_name, ...(item.alternate_titles ?? [])].filter((t, i) => i === 0 || t.trim())
    );
    setDuration(item.package_duration ?? "");
    setTourCode(item.tour_code ?? tourCodeOf(item).replace(/^—$/, ""));
    setDays(
      item.days?.length
        ? item.days.map((d, i) => ({
            ...emptyDay(i + 1),
            ...d,
            day_number: i + 1,
            alternate_titles: d.alternate_titles ?? [],
            locations: d.locations ?? [],
            image_urls: d.image_urls ?? [],
          }))
        : [emptyDay(1)]
    );
    setModalOpen(true);
  }

  function updateDay(index: number, patch: Partial<ItineraryDayPlan>) {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  function setDayTitles(index: number, nextTitles: string[]) {
    const [primary, ...rest] = nextTitles.length ? nextTitles : [""];
    updateDay(index, { title: primary ?? "", alternate_titles: rest });
  }

  /** Persist day images onto the selected master Location (merge, up to 6). */
  async function syncImagesToLocation(locationName: string, urls: string[]) {
    const dest = findDestination(destinations, locationName);
    if (!dest) return;
    const existing = collectDisplayImages(dest.image_url, dest.gallery_urls, 6);
    const merged = [...existing];
    for (const url of urls.filter(Boolean)) {
      if (!merged.includes(url)) merged.push(url);
      if (merged.length >= 6) break;
    }
    const unchanged =
      merged.length === existing.length && merged.every((u, i) => u === existing[i]);
    if (unchanged) return;

    try {
      const updated = await updateMasterContent(
        "destinations",
        dest.id,
        {
          gallery_urls: merged,
          image_url: merged[0] ?? null,
        },
        currentMember
      );
      if (updated) {
        setDestinations((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      }
    } catch (err) {
      show(err instanceof Error ? err.message : "Failed to save location images");
    }
  }

  function setDayLocations(index: number, nextLocations: string[]) {
    const list = nextLocations.length ? nextLocations : [""];
    const [primary, ...rest] = list;
    const primaryName = primary ?? "";
    const prevPrimary = days[index]?.location ?? "";
    const primaryChanged = primaryName.trim().toLowerCase() !== prevPrimary.trim().toLowerCase();
    const photos = primaryChanged
      ? photosForDestination(findDestination(destinations, primaryName))
      : undefined;

    updateDay(index, {
      location: primaryName,
      locations: rest,
      ...(photos !== undefined ? { image_urls: photos } : {}),
    });
  }

  function setDayImages(index: number, urls: string[]) {
    const capped = urls.filter(Boolean).slice(0, MAX_DAY_LOCATION_IMAGES);
    updateDay(index, { image_urls: capped });
    const locationName = days[index]?.location?.trim();
    if (locationName) void syncImagesToLocation(locationName, capped);
  }

  function addDay() {
    if (days.length >= 24) {
      show("Maximum 24 days");
      return;
    }
    setDays((prev) => [...prev, emptyDay(prev.length + 1)]);
  }

  function removeDay(index: number) {
    setDays((prev) =>
      prev.filter((_, i) => i !== index).map((d, i) => ({ ...d, day_number: i + 1 }))
    );
  }

  async function save() {
    const cleanTitles = titles.map((t) => t.trim()).filter(Boolean);
    if (!cleanTitles.length) {
      show("At least one title is required");
      return;
    }

    const cleanDays = days.map((d, i) => {
      const dayTitles = dayTitleList(d).map((t) => t.trim()).filter(Boolean);
      const dayLocs = dayLocationList(d).map((l) => l.trim()).filter(Boolean);
      return {
        day_number: i + 1,
        title: dayTitles[0] ?? "",
        alternate_titles: dayTitles.slice(1),
        location: dayLocs[0] ?? "",
        locations: dayLocs.slice(1),
        description: d.description.trim(),
        image_urls: d.image_urls.filter(Boolean),
      };
    });

    const firstDayImage = cleanDays.find((d) => d.image_urls[0])?.image_urls[0] ?? null;

    const payload = {
      package_name: cleanTitles[0],
      alternate_titles: cleanTitles.slice(1),
      tour_code: tourCode.trim() || null,
      destination: destinationFromDays(cleanDays),
      package_type: (editing?.package_type ?? "Domestic") as Itinerary["package_type"],
      package_duration: duration.trim() || null,
      pdf_url: editing?.pdf_url ?? null,
      cover_image_url: editing?.cover_image_url ?? firstDayImage,
      gallery_urls: firstDayImage ? [firstDayImage] : editing?.gallery_urls ?? [],
      inclusions: editing?.inclusions ?? [],
      exclusions: editing?.exclusions ?? [],
      days: cleanDays,
      show_on_website: editing?.show_on_website ?? true,
      is_trending: editing?.is_trending ?? false,
      status: (editing?.status ?? "active") as "active" | "inactive",
    };

    setSaving(true);
    try {
      if (editing) {
        await updateMasterItinerary(editing.id, payload, currentMember);
        show("Itinerary updated");
      } else {
        await createMasterItinerary(payload, currentMember);
        show("Itinerary created");
      }
      setModalOpen(false);
      void refresh();
    } catch (err) {
      show(err instanceof Error ? err.message : "Failed to save itinerary");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: Itinerary) {
    if (!confirm(`Delete “${item.package_name}”?`)) return;
    await deleteMasterItinerary(item.id);
    show("Deleted");
    void refresh();
  }

  async function toggleActive(item: Itinerary, nextActive: boolean) {
    const patch = {
      status: (nextActive ? "active" : "inactive") as "active" | "inactive",
      show_on_website: nextActive,
    };
    setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, ...patch } : row)));
    try {
      await updateMasterItinerary(item.id, patch, currentMember);
      show(nextActive ? "Marked active" : "Marked inactive (hidden)");
    } catch (err) {
      show(err instanceof Error ? err.message : "Failed to update status");
      void refresh();
    }
  }

  return (
    <>
      <Header />
      <PageMain>
        <PageToolbar>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input
              className="h-10 pl-9"
              placeholder="Search title, tour code, duration (e.g. 01)…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            className="h-10 w-full sm:w-40"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
            <option value="all">All packages</option>
          </Select>
          {canCreate && (
            <Button type="button" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add Itinerary
            </Button>
          )}
        </PageToolbar>

        {statusFilter === "active" && inactiveCount > 0 && (
          <p className="mb-3 text-sm text-stone-500">
            {inactiveCount} inactive package{inactiveCount === 1 ? "" : "s"} hidden.{" "}
            <button
              type="button"
              className="font-medium text-blue-700 underline-offset-2 hover:underline"
              onClick={() => setStatusFilter("inactive")}
            >
              View inactive
            </button>
          </p>
        )}

        {loading ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="w-12 px-3 py-2">S.No.</th>
                  <th className="px-3 py-2">Image</th>
                  <th className="px-3 py-2">Package Title</th>
                  <th className="px-3 py-2">Duration</th>
                  <th className="px-3 py-2">Locations (Count)</th>
                  <th className="px-3 py-2">Tour Code</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((item, index) => (
                  <tr
                    key={item.id}
                    className={item.status !== "active" ? "bg-stone-50/70" : undefined}
                  >
                    <td className="px-3 py-3 tabular-nums text-stone-500">{index + 1}</td>
                    <td className="px-3 py-3">
                      <ImageThumbCarousel
                        urls={packageDisplayImages(item)}
                        width={96}
                        height={64}
                        objectFit="cover"
                        lightboxTitle={item.package_name}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-stone-900">{item.package_name}</p>
                    </td>
                    <td className="px-3 py-3 text-stone-600">
                      {item.package_duration ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-stone-600">{locationsCountOf(item)}</td>
                    <td className="px-3 py-3 font-mono font-medium text-stone-800">
                      {tourCodeOf(item)}
                    </td>
                    <td className="px-3 py-3">
                      <Toggle
                        checked={item.status === "active"}
                        onChange={(v) => void toggleActive(item, v)}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <TableRowActions>
                        <Button
                          type="button"
                          size="sm"
                          className="shrink-0 bg-blue-600 text-white hover:bg-blue-700"
                          onClick={() => openEdit(item)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="shrink-0"
                          onClick={() => void remove(item)}
                        >
                          Delete
                        </Button>
                      </TableRowActions>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-stone-500">
                      {statusFilter === "active"
                        ? "No active itineraries. Existing packages are inactive — switch filter to view them."
                        : "No itineraries match this filter."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </PageMain>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Manage Itinerary" : "Manage Itinerary"}
        description={
          editing
            ? createdByAttribution(currentMember, editing) ??
              "Titles, duration, tour code & day-wise plan"
            : "Titles, duration, tour code & day-wise plan"
        }
        className="sm:max-w-3xl"
      >
        <div className="space-y-5">
          <div>
            <Label>Titles</Label>
            <div className="mt-1.5 space-y-2">
              {titles.map((title, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={title}
                    placeholder={`Title ${index + 1}`}
                    onChange={(e) => {
                      const next = [...titles];
                      next[index] = e.target.value;
                      setTitles(next);
                    }}
                  />
                  {titles.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setTitles(titles.filter((_, i) => i !== index))}
                      aria-label="Remove title"
                    >
                      <Minus className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => setTitles([...titles, ""])}
              >
                <Plus className="h-3.5 w-3.5" /> Add Title
              </Button>
            </div>
          </div>

          <div>
            <Label>Duration</Label>
            <Input
              className="mt-1.5"
              value={duration}
              placeholder="e.g., 5 Nights/6 Days"
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>

          <div>
            <Label>Tour Code</Label>
            <Input
              className="mt-1.5"
              value={tourCode}
              placeholder="e.g., DR064"
              onChange={(e) => setTourCode(e.target.value)}
            />
          </div>

          <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-stone-900">Day-wise Itinerary</p>
              <Button
                type="button"
                size="sm"
                className="bg-blue-600 text-white hover:bg-blue-700"
                onClick={addDay}
              >
                <Plus className="h-3.5 w-3.5" /> Add Day
              </Button>
            </div>
            <div className="space-y-4">
              {days.map((day, index) => {
                const titleRows = dayTitleList(day);
                const locationRows = dayLocationList(day);
                return (
                  <div
                    key={day.day_number}
                    className="space-y-3 rounded-lg border border-stone-200 bg-white p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-stone-800">Day {index + 1}</p>
                      {days.length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeDay(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      )}
                    </div>

                    <div>
                      <Label>Day Title</Label>
                      <div className="mt-1.5 space-y-2">
                        {titleRows.map((title, tIndex) => (
                          <div key={tIndex} className="flex gap-2">
                            <Input
                              value={title}
                              placeholder={`Day ${index + 1} Title ${tIndex + 1}`}
                              onChange={(e) => {
                                const next = [...titleRows];
                                next[tIndex] = e.target.value;
                                setDayTitles(index, next);
                              }}
                            />
                            {titleRows.length > 1 && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setDayTitles(
                                    index,
                                    titleRows.filter((_, i) => i !== tIndex)
                                  )
                                }
                              >
                                <Minus className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          size="sm"
                          className="bg-blue-600 text-white hover:bg-blue-700"
                          onClick={() => setDayTitles(index, [...titleRows, ""])}
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Title
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label>Day Description</Label>
                      <div className="mt-1.5">
                        <RichTextToolbar
                          value={day.description}
                          onChange={(html) => updateDay(index, { description: html })}
                        />
                        <Textarea
                          className="rounded-t-none"
                          rows={4}
                          value={day.description}
                          placeholder="Enter description..."
                          onChange={(e) => updateDay(index, { description: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Locations</Label>
                      <div className="mt-1.5 space-y-2">
                        {locationRows.map((loc, lIndex) => (
                          <div key={lIndex} className="flex gap-2">
                            <Select
                              value={loc}
                              onChange={(e) => {
                                const next = [...locationRows];
                                next[lIndex] = e.target.value;
                                setDayLocations(index, next);
                              }}
                            >
                              <option value="">Select location</option>
                              {loc && !locations.includes(loc) && (
                                <option value={loc}>{loc}</option>
                              )}
                              {locations.map((name) => (
                                <option key={name} value={name}>
                                  {name}
                                </option>
                              ))}
                            </Select>
                            {locationRows.length > 1 && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setDayLocations(
                                    index,
                                    locationRows.filter((_, i) => i !== lIndex)
                                  )
                                }
                              >
                                <Minus className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          type="button"
                          size="sm"
                          className="bg-blue-600 text-white hover:bg-blue-700"
                          onClick={() => setDayLocations(index, [...locationRows, ""])}
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Location
                        </Button>
                      </div>
                    </div>

                    <GalleryImagesField
                      label="Images"
                      value={day.image_urls}
                      onChange={(urls) => setDayImages(index, urls)}
                      max={MAX_DAY_LOCATION_IMAGES}
                      folder="itineraries"
                    />
                    {day.location.trim() &&
                      photosForDestination(findDestination(destinations, day.location))
                        .length === 0 &&
                      day.image_urls.length === 0 && (
                        <p className="text-xs text-stone-400">
                          No photos on this Location yet — add them here to save back to Master
                          Data → Locations.
                        </p>
                      )}
                  </div>
                );
              })}
              {!days.length && (
                <p className="text-sm text-stone-500">No days yet. Click Add Day to start.</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? "Saving…" : editing ? "Save Itinerary" : "Add Itinerary"}
            </Button>
            <Button
              type="button"
              className="flex-1 bg-stone-700 text-white hover:bg-stone-800"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
