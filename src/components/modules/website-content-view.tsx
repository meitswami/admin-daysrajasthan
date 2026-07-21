"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  GalleryImagesField,
  ImageThumbRow,
  collectDisplayImages,
} from "@/components/ui/gallery-images-field";
import { CoverImageUploadField } from "@/components/ui/file-upload-field";
import { useToast } from "@/components/ui/toast";
import { PageMain, PageToolbar } from "@/components/ui/data-table";
import { MediaOverlayCard } from "@/components/shared/media-overlay-card";
import type { PlaceholderCategory } from "@/lib/constants/placeholder-images";
import type { DisplayMode, WebsiteContentItem } from "@/types/database";
import { HOTEL_CATEGORY_OPTIONS } from "@/types/itinerary-builder";
import { Grid3X3, List, Plus, Search, Star, Pencil, Trash2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSystem } from "@/components/providers/system-provider";
import {
  canCreateMasterData,
  canDeleteMasterRecord,
  canEditMasterRecord,
  isMasterDataLocked,
} from "@/lib/rbac/ownership";
import {
  createMasterContent,
  deleteMasterContent,
  listMasterContent,
  updateMasterContent,
  type MasterContentEntity,
} from "@/lib/master-data/content-store";
import { listMasterCategories } from "@/lib/master-data/categories-store";

const TABS: { id: MasterContentEntity; label: string }[] = [
  { id: "destinations", label: "Locations" },
  { id: "hotels", label: "Hotels" },
  { id: "vehicles", label: "Vehicles" },
];

export type MasterDataEntity = MasterContentEntity | "countries" | "cities";

const TAB_TITLES: Record<MasterContentEntity, { title: string; description: string; singular: string }> = {
  destinations: {
    title: "Locations",
    description: "Location master for India — packages & website",
    singular: "Location",
  },
  hotels: { title: "Hotels", description: "Hotel inventory for costing & website", singular: "Hotel" },
  vehicles: { title: "Vehicles", description: "Transport fleet master", singular: "Vehicle" },
};

function getImageCategory(tab: MasterContentEntity): PlaceholderCategory {
  if (tab === "destinations") return "destination";
  if (tab === "hotels") return "hotel";
  return "vehicle";
}

function normalizeEntity(entity?: MasterDataEntity): MasterContentEntity {
  if (entity === "hotels" || entity === "vehicles" || entity === "destinations") return entity;
  return "destinations";
}

function StatusToggle({
  active,
  disabled,
  onChange,
}: {
  active: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-stone-500">Status</span>
      <Toggle
        checked={active}
        onChange={onChange}
        label={active ? "Active" : "Inactive"}
        disabled={disabled}
      />
    </div>
  );
}

export function WebsiteContentView({ entity }: { entity?: MasterDataEntity }) {
  const router = useRouter();
  const { show } = useToast();
  const { currentMember, dataMode } = useSystem();
  const initialTab = normalizeEntity(entity);
  const [tab, setTab] = useState<MasterContentEntity>(initialTab);
  const [viewMode, setViewMode] = useState<DisplayMode>("list");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<WebsiteContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WebsiteContentItem | null>(null);
  const [locked, setLocked] = useState(false);

  const [name, setName] = useState("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [capacity, setCapacity] = useState("");

  const canCreate = canCreateMasterData(currentMember);

  const refresh = useCallback(async () => {
    setLoading(true);
    const rows = await listMasterContent(tab);
    setItems(rows);
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    if (entity === "countries" || entity === "cities") {
      router.replace("/master-data/destinations");
      return;
    }
    if (entity) setTab(normalizeEntity(entity));
  }, [entity, router]);

  useEffect(() => {
    void refresh();
  }, [refresh, dataMode]);

  function selectTab(next: MasterContentEntity) {
    setTab(next);
    if (entity) {
      router.push(`/master-data/${next}`);
      return;
    }
    router.replace(`/website?tab=${next}`);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        !q ||
        i.name.toLowerCase().includes(q) ||
        (i.subtitle?.toLowerCase().includes(q) ?? false) ||
        (i.vehicle_type?.toLowerCase().includes(q) ?? false) ||
        (i.capacity?.toLowerCase().includes(q) ?? false) ||
        (i.google_maps_url?.toLowerCase().includes(q) ?? false)
    );
  }, [items, search]);

  function openAdd() {
    if (!canCreate) {
      show("You do not have permission to add master data");
      return;
    }
    setEditing(null);
    setLocked(false);
    setName("");
    setGalleryUrls([]);
    setGoogleMapsUrl("");
    setVehicleType("");
    setCapacity("");
    setModalOpen(true);
  }

  function openEdit(item: WebsiteContentItem) {
    const isLocked = isMasterDataLocked(currentMember, item);
    setEditing(item);
    setLocked(isLocked);
    setName(item.name);
    setGalleryUrls(collectDisplayImages(item.image_url, item.gallery_urls));
    setGoogleMapsUrl(item.google_maps_url ?? "");
    setVehicleType(item.vehicle_type ?? "");
    setCapacity(item.capacity ?? "");
    setModalOpen(true);
  }

  async function save() {
    if (locked) return;
    if (!name.trim()) {
      show(tab === "vehicles" ? "Model is required" : "Name is required");
      return;
    }

    const gallery = galleryUrls.filter(Boolean).slice(0, 6);
    const payload = {
      name,
      subtitle: null as string | null,
      image_url: gallery[0] ?? null,
      gallery_urls: gallery,
      show_on_website: true,
      is_trending: false,
      display_mode: "list" as DisplayMode,
      country: "India",
      google_maps_url: tab === "hotels" ? googleMapsUrl.trim() || null : null,
      vehicle_type: tab === "vehicles" ? vehicleType.trim() || null : null,
      capacity: tab === "vehicles" ? capacity.trim() || null : null,
    };

    if (editing) {
      if (!canEditMasterRecord(currentMember, editing)) {
        show("You can only edit your own records");
        return;
      }
      await updateMasterContent(tab, editing.id, {
        ...payload,
        show_on_website: editing.show_on_website,
        is_trending: editing.is_trending ?? false,
      });
      show("Updated");
    } else {
      await createMasterContent(tab, payload, currentMember);
      show("Created");
    }
    setModalOpen(false);
    void refresh();
  }

  async function remove(item: WebsiteContentItem) {
    if (!canDeleteMasterRecord(currentMember, item)) {
      show("You can only delete your own records (or need Admin)");
      return;
    }
    if (!confirm(`Delete “${item.name}”?`)) return;
    await deleteMasterContent(tab, item.id);
    show("Deleted");
    void refresh();
  }

  async function toggleStatus(item: WebsiteContentItem, v: boolean) {
    if (!canEditMasterRecord(currentMember, item)) {
      show("View only — created by " + (item.created_by_name ?? "another user"));
      return;
    }
    await updateMasterContent(tab, item.id, { show_on_website: v });
    void refresh();
    show(v ? "Status: Active" : "Status: Inactive");
  }

  async function toggleTrending(item: WebsiteContentItem) {
    if (!canEditMasterRecord(currentMember, item)) {
      show("View only — created by " + (item.created_by_name ?? "another user"));
      return;
    }
    await updateMasterContent(tab, item.id, { is_trending: !item.is_trending });
    void refresh();
    show("Trending updated");
  }

  const heading = TAB_TITLES[tab];

  return (
    <>
      <Header
        title={entity ? heading.title : "Website CMS"}
        description={
          entity
            ? heading.description
            : "Locations, hotels & vehicles for the public site"
        }
      />
      <PageMain>
        <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTab(t.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                tab === t.id ? "bg-amber-100 text-amber-900" : "text-stone-600 hover:bg-stone-100"
              )}
            >
              {t.label}
            </button>
          ))}
          <Link
            href="/master-data/itineraries"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100"
          >
            Itineraries →
          </Link>
          <Link
            href="/master-data/categories"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100"
          >
            Categories →
          </Link>
        </div>

        <PageToolbar>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input
              placeholder="Search here…"
              className="h-10 pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-lg border border-stone-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "rounded-md px-3 py-1.5",
                  viewMode === "grid" ? "bg-amber-100 text-amber-900" : "text-stone-500"
                )}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "rounded-md px-3 py-1.5",
                  viewMode === "list" ? "bg-amber-100 text-amber-900" : "text-stone-500"
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            {canCreate && (
              <Button type="button" onClick={openAdd}>
                <Plus className="h-4 w-4" /> Add New
              </Button>
            )}
          </div>
        </PageToolbar>

        {loading ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                imageCategory={getImageCategory(tab)}
                showTrending={tab === "destinations"}
                canEdit={canEditMasterRecord(currentMember, item)}
                canDelete={canDeleteMasterRecord(currentMember, item)}
                onToggleStatus={toggleStatus}
                onToggleTrending={toggleTrending}
                onEdit={openEdit}
                onDelete={remove}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-3 py-2 w-12">S.No.</th>
                  <th className="px-3 py-2">Images</th>
                  <th className="px-3 py-2">{heading.singular} name</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((item, index) => {
                  const editable = canEditMasterRecord(currentMember, item);
                  const images = collectDisplayImages(item.image_url, item.gallery_urls, 4);
                  return (
                    <tr key={item.id}>
                      <td className="px-3 py-3 tabular-nums text-stone-500">{index + 1}</td>
                      <td className="px-3 py-3">
                        <ImageThumbRow urls={images} size={48} max={4} />
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-stone-900">{item.name}</p>
                        {tab === "vehicles" ? (
                          <p className="text-sm text-stone-500">
                            {[item.vehicle_type, item.capacity ? `${item.capacity} seater` : null]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </p>
                        ) : tab === "hotels" && item.google_maps_url ? (
                          <a
                            href={item.google_maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-amber-700 hover:underline"
                          >
                            Google link
                          </a>
                        ) : item.subtitle ? (
                          <p className="text-sm text-stone-500">{item.subtitle}</p>
                        ) : null}
                        <p className="text-xs text-stone-400">
                          Created by {item.created_by_name ?? "Unknown"}
                          {!editable && " · view only"}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusToggle
                            active={item.show_on_website}
                            disabled={!editable}
                            onChange={(v) => void toggleStatus(item, v)}
                          />
                          {tab === "destinations" && (
                            <button
                              type="button"
                              onClick={() => void toggleTrending(item)}
                              className="rounded-lg p-2 hover:bg-amber-50"
                              disabled={!editable}
                            >
                              <Star
                                className={cn(
                                  "h-4 w-4",
                                  item.is_trending ? "fill-amber-500 text-amber-500" : "text-stone-400"
                                )}
                              />
                            </button>
                          )}
                          <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(item)}>
                            {editable ? <Pencil className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                          </Button>
                          {canDeleteMasterRecord(currentMember, item) && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => void remove(item)}
                            >
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
                    <td colSpan={4} className="px-3 py-8 text-center text-stone-500">
                      No {heading.title.toLowerCase()} yet.
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
        title={
          editing
            ? locked
              ? `View ${heading.singular}`
              : `Edit ${heading.singular}`
            : tab === "vehicles"
              ? "Add New Vehicle"
              : `Add ${heading.singular}`
        }
        description={
          editing
            ? `Created by ${editing.created_by_name ?? "Unknown"}${locked ? " — fields locked" : ""}`
            : undefined
        }
        className="sm:max-w-lg"
      >
        <div className="space-y-4">
          {locked && (
            <Badge variant="warning" className="gap-1">
              <Lock className="h-3 w-3" /> View only
            </Badge>
          )}

          {tab === "vehicles" ? (
            <>
              <div>
                <Label htmlFor="md-model">Model *</Label>
                <Input
                  id="md-model"
                  className="mt-1.5"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={locked}
                  placeholder="e.g., Corolla"
                  required
                />
              </div>
              <div>
                <Label htmlFor="md-type">Type</Label>
                <Input
                  id="md-type"
                  className="mt-1.5"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  disabled={locked}
                  placeholder="e.g., Sedan"
                />
              </div>
              <div>
                <Label htmlFor="md-capacity">Capacity</Label>
                <Input
                  id="md-capacity"
                  className="mt-1.5"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  disabled={locked}
                  placeholder="e.g., 5"
                />
              </div>
              <GalleryImagesField
                label="Vehicle images (up to 6)"
                value={galleryUrls}
                onChange={setGalleryUrls}
                disabled={locked}
              />
            </>
          ) : (
            <>
              <div>
                <Label htmlFor="md-name">Name *</Label>
                <Input
                  id="md-name"
                  className="mt-1.5"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={locked}
                  required
                />
              </div>
              {tab === "hotels" && (
                <div>
                  <Label htmlFor="md-google">Google link</Label>
                  <Input
                    id="md-google"
                    type="url"
                    className="mt-1.5"
                    value={googleMapsUrl}
                    onChange={(e) => setGoogleMapsUrl(e.target.value)}
                    disabled={locked}
                    placeholder="https://maps.google.com/…"
                  />
                </div>
              )}
              <GalleryImagesField
                label={tab === "hotels" ? "Hotel images (up to 6)" : "Images (up to 6)"}
                value={galleryUrls}
                onChange={setGalleryUrls}
                disabled={locked}
              />
            </>
          )}

          {!locked && (
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void save()}>
                {editing ? "Save" : tab === "vehicles" ? "Add Vehicle" : "Create"}
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

function ContentCard({
  item,
  imageCategory,
  showTrending,
  canEdit,
  canDelete,
  onToggleStatus,
  onToggleTrending,
  onEdit,
  onDelete,
}: {
  item: WebsiteContentItem;
  imageCategory: PlaceholderCategory;
  showTrending: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onToggleStatus: (item: WebsiteContentItem, v: boolean) => void;
  onToggleTrending: (item: WebsiteContentItem) => void;
  onEdit: (item: WebsiteContentItem) => void;
  onDelete: (item: WebsiteContentItem) => void;
}) {
  const images = collectDisplayImages(item.image_url, item.gallery_urls, 4);
  return (
    <MediaOverlayCard
      imageUrl={images[0] ?? item.image_url}
      imageCategory={imageCategory}
      minHeightClass="min-h-[220px]"
    >
      <div className="flex justify-end">
        <StatusToggle
          active={item.show_on_website}
          onChange={(v) => onToggleStatus(item, v)}
          disabled={!canEdit}
        />
      </div>
      {images.length > 1 && (
        <div className="mt-2">
          <ImageThumbRow urls={images} size={36} max={4} />
        </div>
      )}
      <div className="mt-auto space-y-3 pt-6">
        <div>
          <p className="text-lg font-bold drop-shadow-sm">{item.name}</p>
          {item.vehicle_type || item.capacity ? (
            <p className="text-sm text-white/90">
              {[item.vehicle_type, item.capacity ? `${item.capacity} seater` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : item.subtitle ? (
            <p className="text-sm text-white/90">{item.subtitle}</p>
          ) : null}
          <p className="mt-1 text-xs text-white/70">By {item.created_by_name ?? "Unknown"}</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-9 w-9 rounded-full p-0 shadow-md"
              onClick={() => onEdit(item)}
            >
              {canEdit ? <Pencil className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            </Button>
            {canDelete && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-9 w-9 rounded-full p-0 shadow-md"
                onClick={() => onDelete(item)}
              >
                <Trash2 className="h-3.5 w-3.5 text-red-600" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {item.is_trending && <Badge className="bg-amber-500/90 text-white">Trending</Badge>}
            {showTrending && (
              <button
                type="button"
                onClick={() => onToggleTrending(item)}
                className="rounded-full bg-black/40 p-2.5 backdrop-blur-sm"
                disabled={!canEdit}
              >
                <Star
                  className={cn(
                    "h-4 w-4",
                    item.is_trending ? "fill-amber-400 text-amber-400" : "text-white"
                  )}
                />
              </button>
            )}
          </div>
        </div>
      </div>
    </MediaOverlayCard>
  );
}
