"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { CoverImageUploadField, FileUploadField } from "@/components/ui/file-upload-field";
import { PageMain, PageToolbar } from "@/components/ui/data-table";
import { useToast } from "@/components/ui/toast";
import { useSystem } from "@/components/providers/system-provider";
import type { Itinerary, PackageType } from "@/types/database";
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
import { Lock, Pencil, Plus, Search, Trash2 } from "lucide-react";

const PACKAGE_TYPES: PackageType[] = [
  "Local Sight Seeing",
  "Domestic",
  "International",
  "Honeymoon",
  "Friends Trip",
  "Tirth Yatra",
  "Family Trip",
];

const DURATIONS = [
  "2 Days 1 Night",
  "3 Days 2 Nights",
  "4 Days 3 Nights",
  "5 Days 4 Nights",
  "6 Days 5 Nights",
  "7 Days 6 Nights",
  "8 Days 7 Nights",
  "10 Days 9 Nights",
];

function linesToText(lines?: string[]) {
  return (lines ?? []).join("\n");
}

function textToLines(text: string) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function MasterItinerariesView() {
  const { show } = useToast();
  const { currentMember } = useSystem();
  const [items, setItems] = useState<Itinerary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Itinerary | null>(null);
  const [locked, setLocked] = useState(false);

  const [packageName, setPackageName] = useState("");
  const [destination, setDestination] = useState("");
  const [packageType, setPackageType] = useState<PackageType>("Domestic");
  const [duration, setDuration] = useState("3 Days 2 Nights");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [galleryText, setGalleryText] = useState("");
  const [inclusions, setInclusions] = useState("");
  const [exclusions, setExclusions] = useState("");
  const [showOnWebsite, setShowOnWebsite] = useState(true);
  const [isTrending, setIsTrending] = useState(false);
  const [status, setStatus] = useState<"active" | "inactive">("active");

  const canCreate = canCreateMasterData(currentMember);

  const refresh = useCallback(async () => {
    setLoading(true);
    setItems(await listMasterItineraries());
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
        (i.destination?.toLowerCase().includes(q) ?? false)
    );
  }, [items, search]);

  function resetForm() {
    setPackageName("");
    setDestination("");
    setPackageType("Domestic");
    setDuration("3 Days 2 Nights");
    setPdfUrl(null);
    setCoverUrl(null);
    setGalleryText("");
    setInclusions("");
    setExclusions("");
    setShowOnWebsite(true);
    setIsTrending(false);
    setStatus("active");
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
    setDestination(item.destination ?? "");
    setPackageType(item.package_type ?? "Domestic");
    setDuration(item.package_duration ?? "3 Days 2 Nights");
    setPdfUrl(item.pdf_url);
    setCoverUrl(item.cover_image_url);
    setGalleryText(linesToText(item.gallery_urls));
    setInclusions(linesToText(item.inclusions));
    setExclusions(linesToText(item.exclusions));
    setShowOnWebsite(item.show_on_website);
    setIsTrending(item.is_trending);
    setStatus(item.status);
    setModalOpen(true);
  }

  async function save() {
    if (locked) return;
    if (!packageName.trim()) {
      show("Package name is required");
      return;
    }
    const payload = {
      package_name: packageName,
      destination,
      package_type: packageType,
      package_duration: duration,
      pdf_url: pdfUrl,
      cover_image_url: coverUrl,
      gallery_urls: textToLines(galleryText),
      inclusions: textToLines(inclusions),
      exclusions: textToLines(exclusions),
      show_on_website: showOnWebsite,
      is_trending: isTrending,
      status,
    };

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
        description="Package master with inclusions, exclusions, PDF & images. Sales Admins see all; edit only own."
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
                  return (
                    <tr key={item.id}>
                      <td className="px-3 py-3">
                        <p className="font-medium text-stone-900">{item.package_name}</p>
                        <p className="text-xs text-stone-500">
                          {item.destination} · {item.package_type}
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
                        <Badge variant={item.status === "active" ? "success" : "default"}>
                          {item.status}
                        </Badge>
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
                    <td colSpan={5} className="px-3 py-8 text-center text-stone-500">
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
            : "Include package details, inclusions, exclusions & media"
        }
        className="sm:max-w-2xl"
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
          <div>
            <Label>Destination *</Label>
            <Input
              className="mt-1.5"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              disabled={locked}
              placeholder="Jaipur · Udaipur"
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
                onChange={(e) => setDuration(e.target.value)}
                disabled={locked}
              >
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <FileUploadField
            label="PDF itinerary"
            accept="application/pdf"
            value={pdfUrl}
            onChange={setPdfUrl}
            disabled={locked}
          />
          <CoverImageUploadField label="Cover image" value={coverUrl} onChange={setCoverUrl} disabled={locked} />
          <div>
            <Label>Gallery image URLs (one per line)</Label>
            <Textarea
              className="mt-1.5"
              rows={3}
              value={galleryText}
              onChange={(e) => setGalleryText(e.target.value)}
              disabled={locked}
              placeholder="https://… or data URLs"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Inclusions (one per line)</Label>
              <Textarea
                className="mt-1.5"
                rows={5}
                value={inclusions}
                onChange={(e) => setInclusions(e.target.value)}
                disabled={locked}
              />
            </div>
            <div>
              <Label>Exclusions (one per line)</Label>
              <Textarea
                className="mt-1.5"
                rows={5}
                value={exclusions}
                onChange={(e) => setExclusions(e.target.value)}
                disabled={locked}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showOnWebsite}
                onChange={(e) => setShowOnWebsite(e.target.checked)}
                disabled={locked}
              />
              Show on website
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isTrending}
                onChange={(e) => setIsTrending(e.target.checked)}
                disabled={locked}
              />
              Trending
            </label>
          </div>
          <div>
            <Label>Status</Label>
            <Select
              className="mt-1.5"
              value={status}
              onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
              disabled={locked}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
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
