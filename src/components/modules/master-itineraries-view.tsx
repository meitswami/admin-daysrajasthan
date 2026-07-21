"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  GalleryImagesField,
  ImageThumbRow,
  collectDisplayImages,
} from "@/components/ui/gallery-images-field";
import { PageMain, PageToolbar } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import { useSystem } from "@/components/providers/system-provider";
import type { Itinerary, ItineraryDayPlan, PackageType } from "@/types/database";
import {
  canCreateMasterData,
  canDeleteMasterRecord,
  canEditMasterRecord,
  isMasterDataLocked,
} from "@/lib/rbac/ownership";
import {
  createMasterItinerary,
  deleteMasterItinerary,
  listMasterItineraries,
  updateMasterItinerary,
} from "@/lib/master-data/itinerary-store";
import { listMasterContent } from "@/lib/master-data/content-store";
import { PACKAGE_DURATIONS } from "@/lib/constants/package-options";
import { Lock, Minus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";

const PACKAGE_TYPES: PackageType[] = [
  "Local Sight Seeing",
  "Domestic",
  "International",
  "Honeymoon",
  "Friends Trip",
  "Tirth Yatra",
  "Family Trip",
];

function emptyDay(dayNumber: number): ItineraryDayPlan {
  return {
    day_number: dayNumber,
    title: "",
    location: "",
    description: "",
    image_urls: [],
  };
}

function daysFromDuration(duration: string, existing: ItineraryDayPlan[] = []): ItineraryDayPlan[] {
  const match = duration.match(/^(\d+)/);
  const count = match ? Math.min(24, Math.max(1, Number(match[1]))) : existing.length || 1;
  const next = existing.slice(0, count);
  while (next.length < count) {
    next.push(emptyDay(next.length + 1));
  }
  return next.map((d, i) => ({ ...d, day_number: i + 1 }));
}

function destinationFromDays(days: ItineraryDayPlan[]): string | null {
  const locations = [
    ...new Set(days.map((d) => d.location.trim()).filter(Boolean)),
  ];
  return locations.length ? locations.join(" · ") : null;
}

function StringListField({
  label,
  value,
  onChange,
  disabled,
  placeholder = "Enter item…",
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const rows = value.length ? value : [""];

  function removeAt(index: number) {
    const next = value.filter((_, i) => i !== index);
    onChange(next.length ? next : []);
  }

  function addLine() {
    onChange([...value.filter((v) => v.trim()), ""]);
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <Label>{label}</Label>
        {!disabled && (
          <Button type="button" size="sm" variant="outline" onClick={addLine}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {rows.map((line, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={line}
              placeholder={placeholder}
              disabled={disabled}
              onChange={(e) => {
                const list = value.length ? [...value] : [""];
                list[index] = e.target.value;
                onChange(list);
              }}
            />
            {!disabled && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeAt(index)}
                aria-label={`Remove ${label} item`}
              >
                <Minus className="h-4 w-4 text-red-500" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MasterItinerariesView() {
  const { show } = useToast();
  const { currentMember } = useSystem();
  const [items, setItems] = useState<Itinerary[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Itinerary | null>(null);
  const [locked, setLocked] = useState(false);

  const [packageName, setPackageName] = useState("");
  const [packageType, setPackageType] = useState<PackageType>("Domestic");
  const [duration, setDuration] = useState("3 Days 2 Nights");
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [inclusions, setInclusions] = useState<string[]>([""]);
  const [exclusions, setExclusions] = useState<string[]>([""]);
  const [days, setDays] = useState<ItineraryDayPlan[]>(() => daysFromDuration("3 Days 2 Nights"));

  const canCreate = canCreateMasterData(currentMember);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [packages, destinationRows] = await Promise.all([
      listMasterItineraries(),
      listMasterContent("destinations"),
    ]);
    setItems(packages);
    setLocations(
      destinationRows
        .map((d) => d.name.trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        !q ||
        i.package_name.toLowerCase().includes(q) ||
        (i.destination?.toLowerCase().includes(q) ?? false) ||
        (i.days ?? []).some((d) => d.location.toLowerCase().includes(q) || d.title.toLowerCase().includes(q))
    );
  }, [items, search]);

  function resetForm() {
    const nextDuration = "3 Days 2 Nights";
    setPackageName("");
    setPackageType("Domestic");
    setDuration(nextDuration);
    setGalleryUrls([]);
    setInclusions([""]);
    setExclusions([""]);
    setDays(daysFromDuration(nextDuration));
  }

  function openAdd() {
    if (!canCreate) {
      show("You do not have permission to add itineraries");
      return;
    }
    setEditing(null);
    setLocked(false);
    resetForm();
    setModalOpen(true);
  }

  function openEdit(item: Itinerary) {
    const isLocked = isMasterDataLocked(currentMember, item);
    setEditing(item);
    setLocked(isLocked);
    setPackageName(item.package_name);
    setPackageType(item.package_type ?? "Domestic");
    const nextDuration = item.package_duration ?? "3 Days 2 Nights";
    setDuration(nextDuration);
    setGalleryUrls(collectDisplayImages(item.cover_image_url, item.gallery_urls));
    setInclusions(item.inclusions?.length ? [...item.inclusions] : [""]);
    setExclusions(item.exclusions?.length ? [...item.exclusions] : [""]);
    setDays(
      item.days?.length
        ? item.days.map((d, i) => ({ ...d, day_number: i + 1 }))
        : daysFromDuration(nextDuration)
    );
    setModalOpen(true);
  }

  function setDurationAndDays(next: string) {
    setDuration(next);
    setDays((prev) => daysFromDuration(next, prev));
  }

  function updateDay(index: number, patch: Partial<ItineraryDayPlan>) {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
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
    if (locked) return;
    if (!packageName.trim()) {
      show("Package name is required");
      return;
    }
    const gallery = galleryUrls.filter(Boolean).slice(0, 6);
    const cleanLines = (lines: string[]) =>
      lines.map((l) => l.trim()).filter(Boolean);
    const cleanDays = days.map((d, i) => ({
      day_number: i + 1,
      title: d.title.trim(),
      location: d.location.trim(),
      description: d.description.trim(),
      image_urls: d.image_urls.filter(Boolean),
    }));

    const payload = {
      package_name: packageName,
      destination: destinationFromDays(cleanDays),
      package_type: packageType,
      package_duration: duration,
      pdf_url: editing?.pdf_url ?? null,
      cover_image_url: gallery[0] ?? null,
      gallery_urls: gallery,
      inclusions: cleanLines(inclusions),
      exclusions: cleanLines(exclusions),
      days: cleanDays,
      show_on_website: editing?.show_on_website ?? true,
      is_trending: editing?.is_trending ?? false,
      status: (editing?.status ?? "active") as "active" | "inactive",
    };

    if (!editing) {
      payload.status = "active";
      payload.show_on_website = true;
      payload.is_trending = false;
    }

    if (editing) {
      if (!canEditMasterRecord(currentMember, editing)) {
        show("You can only edit your own itineraries");
        return;
      }
      await updateMasterItinerary(editing.id, payload);
      show("Itinerary updated");
    } else {
      await createMasterItinerary(payload, currentMember);
      show("Itinerary created");
    }
    setModalOpen(false);
    void refresh();
  }

  async function remove(item: Itinerary) {
    if (!canDeleteMasterRecord(currentMember, item)) {
      show("You can only delete your own itineraries (or need Admin)");
      return;
    }
    if (!confirm(`Delete “${item.package_name}”?`)) return;
    await deleteMasterItinerary(item.id);
    show("Deleted");
    void refresh();
  }

  return (
    <>
      <Header
        title="Itineraries"
        description="Package master with day-wise plan, inclusions, exclusions & images. Sales Admins see all; edit only own."
      />
      <PageMain>
        <PageToolbar>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input
              className="h-10 pl-9"
              placeholder="Search packages…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {canCreate && (
            <Button type="button" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add Itinerary
            </Button>
          )}
        </PageToolbar>

        {loading ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
                <tr>
                  <th className="px-3 py-2">Images</th>
                  <th className="px-3 py-2">Package</th>
                  <th className="px-3 py-2">Duration</th>
                  <th className="px-3 py-2">Created by</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((item) => {
                  const editable = canEditMasterRecord(currentMember, item);
                  const dayLocations = [
                    ...new Set((item.days ?? []).map((d) => d.location).filter(Boolean)),
                  ];
                  return (
                    <tr key={item.id}>
                      <td className="px-3 py-3">
                        <ImageThumbRow
                          urls={collectDisplayImages(item.cover_image_url, item.gallery_urls)}
                          size={44}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-stone-900">{item.package_name}</p>
                        <p className="text-xs text-stone-500">
                          {(dayLocations.length ? dayLocations.join(" · ") : item.destination) ||
                            "—"}{" "}
                          · {item.package_type}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-stone-600">{item.package_duration}</td>
                      <td className="px-3 py-3 text-stone-600">
                        {item.created_by_name ?? "Unknown"}
                        {!editable && (
                          <span className="ml-1 text-xs text-amber-700">(view only)</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-2">
                          <Badge variant={item.status === "active" ? "success" : "default"}>
                            {item.status === "active" ? "Active" : "Inactive"}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-stone-500">Website</span>
                            <Toggle
                              checked={item.show_on_website}
                              disabled={!editable}
                              label={item.show_on_website ? "On" : "Off"}
                              onChange={(v) => {
                                void updateMasterItinerary(item.id, { show_on_website: v }, currentMember).then(
                                  () => void refresh()
                                );
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1">
                          <Button type="button" size="sm" variant="ghost" onClick={() => openEdit(item)}>
                            {editable ? <Pencil className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                          </Button>
                          {canDeleteMasterRecord(currentMember, item) && (
                            <Button type="button" size="sm" variant="ghost" onClick={() => void remove(item)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-stone-500">
                      No itineraries yet. Add a package to get started.
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
        title={editing ? (locked ? "View itinerary" : "Edit itinerary") : "Add itinerary"}
        description={
          editing
            ? `Created by ${editing.created_by_name ?? "Unknown"}${locked ? " — fields locked" : ""}`
            : "Package details, day-wise plan, inclusions, exclusions & media"
        }
        className="sm:max-w-3xl"
      >
        <div className="space-y-4">
          {locked && (
            <Badge variant="warning" className="gap-1">
              <Lock className="h-3 w-3" /> View only
            </Badge>
          )}
          <div>
            <Label>Package name *</Label>
            <Input
              className="mt-1.5"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              disabled={locked}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Package type</Label>
              <Select
                className="mt-1.5"
                value={packageType}
                onChange={(e) => setPackageType(e.target.value as PackageType)}
                disabled={locked}
              >
                {PACKAGE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Duration</Label>
              <Select
                className="mt-1.5"
                value={duration}
                onChange={(e) => setDurationAndDays(e.target.value)}
                disabled={locked}
              >
                {PACKAGE_DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <GalleryImagesField
            label="Package images (up to 6)"
            value={galleryUrls}
            onChange={setGalleryUrls}
            disabled={locked}
          />

          <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-stone-900">Day-wise Itinerary</p>
                <p className="text-xs text-stone-500">
                  Title, location, description & images for each day
                </p>
              </div>
              {!locked && (
                <Button type="button" size="sm" onClick={addDay}>
                  <Plus className="h-3.5 w-3.5" /> Add Day
                </Button>
              )}
            </div>
            <div className="space-y-4">
              {days.map((day, index) => (
                <div
                  key={day.day_number}
                  className="space-y-3 rounded-lg border border-stone-200 bg-white p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-stone-800">Day {index + 1}</p>
                    {!locked && days.length > 1 && (
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
                    <Label>Day title</Label>
                    <Input
                      className="mt-1.5"
                      value={day.title}
                      placeholder={`Day ${index + 1} title`}
                      disabled={locked}
                      onChange={(e) => updateDay(index, { title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Location</Label>
                    <Select
                      className="mt-1.5"
                      value={day.location}
                      disabled={locked}
                      onChange={(e) => updateDay(index, { location: e.target.value })}
                    >
                      <option value="">Select location</option>
                      {day.location && !locations.includes(day.location) && (
                        <option value={day.location}>{day.location}</option>
                      )}
                      {locations.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      className="mt-1.5"
                      rows={3}
                      value={day.description}
                      placeholder="Enter description…"
                      disabled={locked}
                      onChange={(e) => updateDay(index, { description: e.target.value })}
                    />
                  </div>
                  <GalleryImagesField
                    label="Day images"
                    value={day.image_urls}
                    onChange={(urls) => updateDay(index, { image_urls: urls })}
                    disabled={locked}
                    max={4}
                  />
                </div>
              ))}
              {!days.length && (
                <p className="text-sm text-stone-500">No days yet. Click Add Day to start.</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <StringListField
              label="Inclusions"
              value={inclusions}
              onChange={setInclusions}
              disabled={locked}
              placeholder="e.g. Breakfast"
            />
            <StringListField
              label="Exclusions"
              value={exclusions}
              onChange={setExclusions}
              disabled={locked}
              placeholder="e.g. Airfare"
            />
          </div>

          {!locked && (
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void save()}>
                {editing ? "Save" : "Create"}
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
