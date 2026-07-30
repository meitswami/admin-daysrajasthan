"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { Modal } from "@/components/ui/modal";
import {
  GalleryImagesField,
  ImageThumbRow,
  collectDisplayImages,
} from "@/components/ui/gallery-images-field";
import { useToast } from "@/components/ui/toast";
import { PageMain, PageToolbar, TableRowActions } from "@/components/ui/data-table";
import { MediaOverlayCard } from "@/components/shared/media-overlay-card";
import type { PlaceholderCategory } from "@/lib/constants/placeholder-images";
import type { DisplayMode, VehicleProvider, WebsiteContentItem } from "@/types/database";
import { HOTEL_CATEGORY_OPTIONS } from "@/types/itinerary-builder";
import { Grid3X3, List, Plus, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSystem } from "@/components/providers/system-provider";
import { canCreateMasterData, createdByAttribution, isOwnCreatedRecord } from "@/lib/rbac/ownership";
import {
  createMasterContent,
  deleteMasterContent,
  listMasterContent,
  updateMasterContent,
  type MasterContentEntity,
} from "@/lib/master-data/content-store";
import { listMasterCategories } from "@/lib/master-data/categories-store";
import {
  emptyVehicleProvider,
  normalizeVehicleProviders,
} from "@/lib/master-data/vehicle-providers";

const CMS_TABS: { id: MasterContentEntity; label: string }[] = [
  { id: "destinations", label: "Locations" },
  { id: "hotels", label: "Hotels" },
  { id: "vehicles", label: "Vehicles" },
];

export type MasterDataEntity = MasterContentEntity | "countries" | "cities";

const TAB_TITLES: Record<MasterContentEntity, { title: string; singular: string }> = {
  destinations: { title: "Locations", singular: "Location" },
  hotels: { title: "Hotels", singular: "Hotel" },
  vehicles: { title: "Vehicles", singular: "Vehicle" },
};

function hotelCategoryOptions(): { value: string; label: string }[] {
  const fromMaster = listMasterCategories().map((c) => ({ value: c.label, label: c.label }));
  if (fromMaster.length) return fromMaster;
  return HOTEL_CATEGORY_OPTIONS.map((c) => ({ value: c.label, label: c.label }));
}

function getImageCategory(tab: MasterContentEntity): PlaceholderCategory {
  if (tab === "destinations") return "destination";
  if (tab === "hotels") return "hotel";
  return "vehicle";
}

function formatInrAmount(value?: string | null): string {
  const v = value?.trim();
  if (!v) return "—";
  return /^₹/.test(v) ? v : `₹${v}`;
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
  return <Toggle checked={active} onChange={onChange} disabled={disabled} />;
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

  const [name, setName] = useState("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [capacity, setCapacity] = useState("");
  const [providers, setProviders] = useState<VehicleProvider[]>([emptyVehicleProvider()]);
  const [hotelCategory, setHotelCategory] = useState("");
  const [hotelLocation, setHotelLocation] = useState("");
  const [priceDescription, setPriceDescription] = useState("");
  const [rating, setRating] = useState("0");
  const [reviewsCount, setReviewsCount] = useState("0");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [locations, setLocations] = useState<string[]>([]);

  const canCreate = canCreateMasterData(currentMember);
  const categoryOptions = useMemo(() => hotelCategoryOptions(), []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const rows = await listMasterContent(tab);
    setItems(rows);
    if (tab === "hotels") {
      const dests = await listMasterContent("destinations");
      const names = dests.map((d) => d.name).filter(Boolean);
      setLocations([...new Set(names)].sort((a, b) => a.localeCompare(b)));
    }
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

  function selectCmsTab(next: MasterContentEntity) {
    setTab(next);
    router.replace(`/website?tab=${next}`);
  }

  const isMasterDataPage = Boolean(entity);
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((i) => {
      if (tab === "hotels") {
        if (filterCategory && (i.category ?? "") !== filterCategory) return false;
        if (filterLocation && (i.location ?? "") !== filterLocation) return false;
      }
      return (
        !q ||
        i.name.toLowerCase().includes(q) ||
        (i.subtitle?.toLowerCase().includes(q) ?? false) ||
        (i.category?.toLowerCase().includes(q) ?? false) ||
        (i.location?.toLowerCase().includes(q) ?? false) ||
        (i.price_description?.toLowerCase().includes(q) ?? false) ||
        (i.vehicle_type?.toLowerCase().includes(q) ?? false) ||
        (i.capacity?.toLowerCase().includes(q) ?? false) ||
        (i.provider_company_name?.toLowerCase().includes(q) ?? false) ||
        (i.contact_person_name?.toLowerCase().includes(q) ?? false) ||
        (i.contact_phone_1?.toLowerCase().includes(q) ?? false) ||
        (i.contact_phone_2?.toLowerCase().includes(q) ?? false) ||
        (i.price_per_km?.toLowerCase().includes(q) ?? false) ||
        (i.price_per_day?.toLowerCase().includes(q) ?? false) ||
        (i.providers?.some(
          (p) =>
            p.provider_company_name.toLowerCase().includes(q) ||
            (p.contact_person_name?.toLowerCase().includes(q) ?? false) ||
            (p.contact_phone_1?.toLowerCase().includes(q) ?? false) ||
            (p.contact_phone_2?.toLowerCase().includes(q) ?? false)
        ) ??
          false) ||
        (i.google_maps_url?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [items, search, tab, filterCategory, filterLocation]);

  function resetHotelFields() {
    setHotelCategory("");
    setHotelLocation("");
    setPriceDescription("");
    setRating("0");
    setReviewsCount("0");
    setGoogleMapsUrl("");
  }

  function resetVehicleFields() {
    setVehicleType("");
    setCapacity("");
    setProviders([emptyVehicleProvider()]);
  }

  function updateProvider(id: string, patch: Partial<VehicleProvider>) {
    setProviders((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function addProvider() {
    setProviders((list) => [...list, emptyVehicleProvider()]);
  }

  function removeProvider(id: string) {
    setProviders((list) => {
      const next = list.filter((p) => p.id !== id);
      return next.length ? next : [emptyVehicleProvider()];
    });
  }

  function openAdd() {
    if (!canCreate) {
      show("You do not have permission to add master data");
      return;
    }
    setEditing(null);
    setName("");
    setGalleryUrls([]);
    setGoogleMapsUrl("");
    resetVehicleFields();
    resetHotelFields();
    setModalOpen(true);
  }

  function openEdit(item: WebsiteContentItem) {
    setEditing(item);
    setName(item.name);
    setGalleryUrls(collectDisplayImages(item.image_url, item.gallery_urls));
    setGoogleMapsUrl(item.google_maps_url ?? "");
    setVehicleType(item.vehicle_type ?? "");
    setCapacity(item.capacity ?? "");
    const existing = normalizeVehicleProviders(item);
    setProviders(existing.length ? existing : [emptyVehicleProvider()]);
    setHotelCategory(item.category ?? "");
    setHotelLocation(item.location ?? "");
    setPriceDescription(item.price_description ?? "");
    setRating(String(item.rating ?? 0));
    setReviewsCount(String(item.reviews_count ?? 0));
    setModalOpen(true);
  }

  async function save() {
    if (!name.trim()) {
      show(tab === "vehicles" ? "Model is required" : "Name is required");
      return;
    }
    if (tab === "hotels" && !hotelCategory.trim()) {
      show("Hotel category is required");
      return;
    }
    if (tab === "hotels" && !hotelLocation.trim()) {
      show("Hotel location is required");
      return;
    }

    const parsedRating = Math.min(5, Math.max(0, Number(rating) || 0));
    const parsedReviews = Math.max(0, Math.floor(Number(reviewsCount) || 0));
    const gallery = galleryUrls.filter(Boolean).slice(0, 6);

    const payload = {
      name,
      subtitle: null as string | null,
      image_url: gallery[0] ?? null,
      gallery_urls: gallery,
      show_on_website: true,
      is_trending: false,
      display_mode: "list" as DisplayMode,
      ...(tab !== "vehicles" ? { country: "India" } : {}),
      ...(tab === "hotels"
        ? {
            google_maps_url: googleMapsUrl.trim() || null,
            category: hotelCategory.trim() || null,
            location: hotelLocation.trim() || null,
            price_description: priceDescription.trim() || null,
            rating: parsedRating,
            reviews_count: parsedReviews,
          }
        : {}),
      ...(tab === "vehicles"
        ? {
            vehicle_type: vehicleType.trim() || null,
            capacity: capacity.trim() || null,
            providers,
          }
        : {}),
    };

    if (editing) {
      try {
        await updateMasterContent(tab, editing.id, {
          ...payload,
          show_on_website: editing.show_on_website,
          is_trending: editing.is_trending ?? false,
        });
        show("Updated");
      } catch (err) {
        show(err instanceof Error ? err.message : "Failed to update");
        return;
      }
    } else {
      try {
        await createMasterContent(tab, payload, currentMember);
        show("Created");
      } catch (err) {
        show(err instanceof Error ? err.message : "Failed to create");
        return;
      }
    }
    setModalOpen(false);
    void refresh();
  }

  async function remove(item: WebsiteContentItem) {
    if (!confirm(`Delete “${item.name}”?`)) return;
    await deleteMasterContent(tab, item.id);
    show("Deleted");
    void refresh();
  }

  async function toggleStatus(item: WebsiteContentItem, v: boolean) {
    await updateMasterContent(tab, item.id, { show_on_website: v });
    void refresh();
    show(v ? "Status: Active" : "Status: Inactive");
  }

  const heading = TAB_TITLES[tab];

  return (
    <>
      {isMasterDataPage ? (
        <Header />
      ) : (
        <Header
          title="Website CMS"
          description="Locations, hotels & vehicles for the public site"
        />
      )}
      <PageMain>
        {!isMasterDataPage && (
          <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3">
            {CMS_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectCmsTab(t.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  tab === t.id ? "bg-amber-100 text-amber-900" : "text-stone-600 hover:bg-stone-100"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <PageToolbar>
          {tab === "hotels" ? (
            <div className="flex w-full min-w-0 max-w-full flex-col gap-3">
              <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="min-w-0 shrink text-sm font-semibold text-stone-700">Filter Hotels</p>
                {canCreate && (
                  <Button
                    type="button"
                    className="w-full shrink-0 whitespace-nowrap sm:w-auto"
                    onClick={openAdd}
                  >
                    <Plus className="h-4 w-4" /> Add Hotel
                  </Button>
                )}
              </div>
              <div className="grid w-full min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="min-w-0">
                  <Label htmlFor="hotel-filter-name">Hotel Name</Label>
                  <div className="relative mt-1.5">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <Input
                      id="hotel-filter-name"
                      placeholder="Search by name..."
                      className="h-10 pl-9"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="min-w-0">
                  <Label htmlFor="hotel-filter-category">Category</Label>
                  <Select
                    id="hotel-filter-category"
                    className="mt-1.5"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {categoryOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="min-w-0 sm:col-span-2 lg:col-span-1">
                  <Label htmlFor="hotel-filter-location">Location</Label>
                  <Select
                    id="hotel-filter-location"
                    className="mt-1.5"
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                  >
                    <option value="">All Locations</option>
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="relative w-full min-w-0 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <Input
                  placeholder="Search here…"
                  className="h-10 pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
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
                  <Button
                    type="button"
                    className="w-full shrink-0 whitespace-nowrap sm:w-auto"
                    onClick={openAdd}
                  >
                    <Plus className="h-4 w-4" /> Add New
                  </Button>
                )}
              </div>
            </>
          )}
        </PageToolbar>

        {loading ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : tab === "hotels" || viewMode === "list" ? (
          <div
            className={
              tab === "hotels"
                ? "w-0 min-w-full max-w-full overflow-hidden rounded-xl border border-stone-200 bg-white"
                : "w-0 min-w-full max-w-full overflow-x-auto rounded-xl border border-stone-200 bg-white"
            }
          >
            <table
              className={
                tab === "hotels"
                  ? "w-full table-fixed text-sm"
                  : "w-full min-w-[960px] text-sm"
              }
            >
              <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                {tab === "hotels" ? (
                  <tr>
                    <th className="w-10 px-2 py-2">S.No.</th>
                    <th className="w-[4.5rem] px-2 py-2">Image</th>
                    <th className="px-2 py-2">Hotel Name</th>
                    <th className="w-[12%] px-2 py-2">Category</th>
                    <th className="w-[11%] px-2 py-2">Price/Night</th>
                    <th className="w-[8%] px-2 py-2">Location</th>
                    <th className="w-12 px-2 py-2">Rating</th>
                    <th className="w-14 px-2 py-2">Reviews</th>
                    <th className="w-[6.5rem] px-2 py-2">Google</th>
                    <th className="w-[12.5rem] px-2 py-2">Actions</th>
                  </tr>
                ) : tab === "vehicles" ? (
                  <tr>
                    <th className="px-3 py-2 w-12">S.No.</th>
                    <th className="px-3 py-2">Images</th>
                    <th className="px-3 py-2">Vehicle name</th>
                    <th className="px-3 py-2">Provider</th>
                    <th className="px-3 py-2">Contact</th>
                    <th className="px-3 py-2">Phones</th>
                    <th className="px-3 py-2">Per km</th>
                    <th className="px-3 py-2">Per day</th>
                    <th className="whitespace-nowrap px-3 py-2">Actions</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-3 py-2 w-12">S.No.</th>
                    <th className="px-3 py-2">Images</th>
                    <th className="px-3 py-2">{heading.singular} name</th>
                    <th className="whitespace-nowrap px-3 py-2">Actions</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((item, index) => {
                  const images = collectDisplayImages(item.image_url, item.gallery_urls, 4);
                  if (tab === "hotels") {
                    return (
                      <tr key={item.id}>
                        <td className="px-2 py-2.5 tabular-nums text-stone-500">{index + 1}</td>
                        <td className="px-2 py-2.5">
                          <ImageThumbRow
                            urls={images.slice(0, 1)}
                            width={64}
                            height={44}
                            max={1}
                            lightboxTitle={item.name}
                          />
                        </td>
                        <td className="truncate px-2 py-2.5 font-semibold text-stone-900" title={item.name}>
                          {item.name}
                        </td>
                        <td className="truncate px-2 py-2.5 text-stone-700" title={item.category || undefined}>
                          {item.category || "—"}
                        </td>
                        <td
                          className="truncate px-2 py-2.5 text-stone-600"
                          title={item.price_description?.trim() || undefined}
                        >
                          {item.price_description?.trim() || "Not specified"}
                        </td>
                        <td className="truncate px-2 py-2.5 text-stone-700">{item.location || "—"}</td>
                        <td className="px-2 py-2.5 tabular-nums text-stone-700">
                          {item.rating != null ? Number(item.rating).toFixed(1) : "—"}
                        </td>
                        <td className="px-2 py-2.5 tabular-nums text-stone-700">
                          {item.reviews_count ?? "—"}
                        </td>
                        <td className="px-2 py-2.5">
                          {item.google_maps_url ? (
                            <a
                              href={item.google_maps_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-blue-600 hover:underline"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-stone-400">—</span>
                          )}
                        </td>
                        <td className="px-2 py-2.5">
                          <TableRowActions className="gap-1.5">
                            <StatusToggle
                              active={item.show_on_website}
                              onChange={(v) => void toggleStatus(item, v)}
                            />
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
                    );
                  }
                  if (tab === "vehicles") {
                    const vehicleProviders = normalizeVehicleProviders(item);
                    const primary = vehicleProviders[0];
                    const phones = primary
                      ? [primary.contact_phone_1, primary.contact_phone_2].filter(Boolean).join(" · ")
                      : "";
                    const extraCount = Math.max(0, vehicleProviders.length - 1);
                    return (
                      <tr key={item.id}>
                        <td className="px-3 py-3 tabular-nums text-stone-500">{index + 1}</td>
                        <td className="px-3 py-3">
                          <ImageThumbRow
                            urls={images}
                            width={112}
                            height={72}
                            max={4}
                            lightboxTitle={item.name}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-stone-900">{item.name}</p>
                          <p className="text-sm text-stone-500">
                            {[item.vehicle_type, item.capacity ? `${item.capacity} seater` : null]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </p>
                          {createdByAttribution(currentMember, item) ? (
                            <p className="text-xs text-stone-400">
                              {createdByAttribution(currentMember, item)}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 text-stone-700">
                          <p>{primary?.provider_company_name?.trim() || "—"}</p>
                          {extraCount > 0 ? (
                            <p className="text-xs text-stone-500">+{extraCount} more</p>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 text-stone-700">
                          {primary?.contact_person_name?.trim() || "—"}
                        </td>
                        <td className="px-3 py-3 text-stone-700">{phones || "—"}</td>
                        <td className="px-3 py-3 tabular-nums text-stone-700">
                          {formatInrAmount(primary?.price_per_km)}
                        </td>
                        <td className="px-3 py-3 tabular-nums text-stone-700">
                          {formatInrAmount(primary?.price_per_day)}
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
                    );
                  }
                  return (
                    <tr key={item.id}>
                      <td className="px-3 py-3 tabular-nums text-stone-500">{index + 1}</td>
                      <td className="px-3 py-3">
                        <ImageThumbRow
                          urls={images}
                          width={96}
                          height={64}
                          max={4}
                          lightboxTitle={item.name}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-stone-900">{item.name}</p>
                        {item.subtitle ? (
                          <p className="text-sm text-stone-500">{item.subtitle}</p>
                        ) : null}
                        {createdByAttribution(currentMember, item) ? (
                          <p className="text-xs text-stone-400">
                            {createdByAttribution(currentMember, item)}
                          </p>
                        ) : null}
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
                  );
                })}
                {!filtered.length && (
                  <tr>
                    <td
                      colSpan={tab === "hotels" ? 10 : tab === "vehicles" ? 9 : 4}
                      className="px-3 py-8 text-center text-stone-500"
                    >
                      No {heading.title.toLowerCase()} yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                imageCategory={getImageCategory(tab)}
                showStatus={false}
                hideOwnCreator={isOwnCreatedRecord(currentMember, item)}
                onToggleStatus={toggleStatus}
                onEdit={openEdit}
                onDelete={remove}
              />
            ))}
          </div>
        )}
      </PageMain>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editing
            ? `Edit ${heading.singular}`
            : tab === "vehicles"
              ? "Add New Vehicle"
              : tab === "hotels"
                ? "Add Hotel"
                : `Add ${heading.singular}`
        }
        description={
          editing ? createdByAttribution(currentMember, editing) ?? undefined : undefined
        }
        className={
          tab === "hotels" || tab === "vehicles" ? "sm:max-w-2xl" : "sm:max-w-lg"
        }
      >
        <div className="space-y-4">
          {tab === "vehicles" ? (
            <>
              <div>
                <Label htmlFor="md-model">Model *</Label>
                <Input
                  id="md-model"
                  className="mt-1.5"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Corolla"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="md-type">Type</Label>
                  <Input
                    id="md-type"
                    className="mt-1.5"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
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
                    placeholder="e.g., 5"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <Label>Transport providers</Label>
                    <p className="mt-0.5 text-xs text-stone-500">
                      One vehicle can be supplied by multiple travel / transport agencies
                    </p>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={addProvider}>
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add provider
                  </Button>
                </div>
                {providers.map((provider, index) => (
                  <div
                    key={provider.id}
                    className="space-y-3 rounded-xl border border-stone-200 bg-stone-50/80 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-stone-800">
                        Provider {index + 1}
                      </p>
                      {providers.length > 1 ? (
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-red-500 hover:bg-white hover:text-red-700"
                          aria-label={`Remove provider ${index + 1}`}
                          onClick={() => removeProvider(provider.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                    <div>
                      <Label htmlFor={`md-provider-${provider.id}`}>
                        Vehicle Provider Company Name
                      </Label>
                      <Input
                        id={`md-provider-${provider.id}`}
                        className="mt-1.5"
                        value={provider.provider_company_name}
                        onChange={(e) =>
                          updateProvider(provider.id, {
                            provider_company_name: e.target.value,
                          })
                        }
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`md-contact-name-${provider.id}`}>Contact Person Name</Label>
                      <Input
                        id={`md-contact-name-${provider.id}`}
                        className="mt-1.5"
                        value={provider.contact_person_name ?? ""}
                        onChange={(e) =>
                          updateProvider(provider.id, { contact_person_name: e.target.value })
                        }
                        placeholder="Optional"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor={`md-phone-1-${provider.id}`}>
                          Contact Person Phone Number 1
                        </Label>
                        <Input
                          id={`md-phone-1-${provider.id}`}
                          className="mt-1.5"
                          type="tel"
                          value={provider.contact_phone_1 ?? ""}
                          onChange={(e) =>
                            updateProvider(provider.id, { contact_phone_1: e.target.value })
                          }
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`md-phone-2-${provider.id}`}>
                          Contact Person Phone Number 2
                        </Label>
                        <Input
                          id={`md-phone-2-${provider.id}`}
                          className="mt-1.5"
                          type="tel"
                          value={provider.contact_phone_2 ?? ""}
                          onChange={(e) =>
                            updateProvider(provider.id, { contact_phone_2: e.target.value })
                          }
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor={`md-price-km-${provider.id}`}>Price — per km cost</Label>
                        <Input
                          id={`md-price-km-${provider.id}`}
                          className="mt-1.5"
                          value={provider.price_per_km ?? ""}
                          onChange={(e) =>
                            updateProvider(provider.id, { price_per_km: e.target.value })
                          }
                          placeholder="e.g., 18"
                        />
                        <p className="mt-1 text-xs text-stone-500">
                          Optional · shown as ₹ on the list
                        </p>
                      </div>
                      <div>
                        <Label htmlFor={`md-price-day-${provider.id}`}>
                          Price — per day running cost
                        </Label>
                        <Input
                          id={`md-price-day-${provider.id}`}
                          className="mt-1.5"
                          value={provider.price_per_day ?? ""}
                          onChange={(e) =>
                            updateProvider(provider.id, { price_per_day: e.target.value })
                          }
                          placeholder="e.g., 4500"
                        />
                        <p className="mt-1 text-xs text-stone-500">
                          Optional · shown as ₹ on the list
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <GalleryImagesField
                label="Vehicle images (up to 6)"
                value={galleryUrls}
                onChange={setGalleryUrls}
                folder="vehicles"
              />
            </>
          ) : tab === "hotels" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="md-hotel-name">Hotel Name</Label>
                  <Input
                    id="md-hotel-name"
                    className="mt-1.5"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter hotel name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="md-hotel-category">Hotel Category</Label>
                  <Select
                    id="md-hotel-category"
                    className="mt-1.5"
                    value={hotelCategory}
                    onChange={(e) => setHotelCategory(e.target.value)}
                    required
                  >
                    <option value="">Select Category</option>
                    {categoryOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="md-price-description">
                  Price Description (You can write full details)
                </Label>
                <Textarea
                  id="md-price-description"
                  className="mt-1.5 min-h-[120px]"
                  value={priceDescription}
                  onChange={(e) => setPriceDescription(e.target.value)}
                  placeholder="e.g. Starting from ₹2,999 per night | Includes breakfast & WiFi | Seasonal rates apply | Deluxe Room: ₹4,500 | Suite: ₹8,000"
                />
                <p className="mt-1 text-xs text-stone-500">You can write full pricing details here</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="md-hotel-location">Hotel Location</Label>
                  <Select
                    id="md-hotel-location"
                    className="mt-1.5"
                    value={hotelLocation}
                    onChange={(e) => setHotelLocation(e.target.value)}
                    required
                  >
                    <option value="">Select Location</option>
                    {[
                      ...locations,
                      ...(hotelLocation && !locations.includes(hotelLocation)
                        ? [hotelLocation]
                        : []),
                    ].map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="md-rating">Rating (0-5)</Label>
                  <Input
                    id="md-rating"
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    className="mt-1.5"
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="md-reviews">Number of Reviews</Label>
                <Input
                  id="md-reviews"
                  type="number"
                  min={0}
                  step={1}
                  className="mt-1.5"
                  value={reviewsCount}
                  onChange={(e) => setReviewsCount(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="md-google">Google Review Link</Label>
                <Input
                  id="md-google"
                  type="url"
                  className="mt-1.5"
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  placeholder="Enter Google review link (optional)"
                />
              </div>

              <GalleryImagesField
                label="Hotel images (up to 6)"
                value={galleryUrls}
                onChange={setGalleryUrls}
                folder="hotels"
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
                  required
                />
              </div>
              <GalleryImagesField
                label="Images (up to 6)"
                value={galleryUrls}
                onChange={setGalleryUrls}
                folder="destinations"
              />
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
              {tab === "hotels" ? (
                <>
                  <Button type="button" onClick={() => void save()}>
                    {editing ? "Save Hotel" : "Add Hotel"}
                  </Button>
                  <Button
                    type="button"
                    className="bg-stone-700 text-white hover:bg-stone-800"
                    onClick={() => setModalOpen(false)}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={() => void save()}>
                    {editing ? "Save" : tab === "vehicles" ? "Add Vehicle" : "Create"}
                  </Button>
                </>
              )}
            </div>
        </div>
      </Modal>
    </>
  );
}

function ContentCard({
  item,
  imageCategory,
  showStatus,
  hideOwnCreator,
  onToggleStatus,
  onEdit,
  onDelete,
}: {
  item: WebsiteContentItem;
  imageCategory: PlaceholderCategory;
  showStatus: boolean;
  hideOwnCreator?: boolean;
  onToggleStatus: (item: WebsiteContentItem, v: boolean) => void;
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
      {showStatus && (
        <div className="flex justify-end">
          <StatusToggle
            active={item.show_on_website}
            onChange={(v) => onToggleStatus(item, v)}
          />
        </div>
      )}
      {images.length > 1 && (
        <div className="mt-2">
          <ImageThumbRow
            urls={images}
            width={72}
            height={48}
            max={4}
            lightboxTitle={item.name}
          />
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
          {item.provider_company_name || (item.providers?.length ?? 0) > 0 ? (
            <p className="text-xs text-white/75">
              {normalizeVehicleProviders(item)
                .map((p) => p.provider_company_name.trim())
                .filter(Boolean)
                .join(" · ") || item.provider_company_name}
            </p>
          ) : null}
          {(item.price_per_km || item.price_per_day || (item.providers?.length ?? 0) > 0) && (
            <p className="text-xs text-white/75">
              {(() => {
                const primary = normalizeVehicleProviders(item)[0];
                return [
                  primary?.price_per_km?.trim()
                    ? `${formatInrAmount(primary.price_per_km)}/km`
                    : item.price_per_km?.trim()
                      ? `${formatInrAmount(item.price_per_km)}/km`
                      : null,
                  primary?.price_per_day?.trim()
                    ? `${formatInrAmount(primary.price_per_day)}/day`
                    : item.price_per_day?.trim()
                      ? `${formatInrAmount(item.price_per_day)}/day`
                      : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
              })()}
            </p>
          )}
          {!hideOwnCreator && item.created_by_name?.trim() ? (
            <p className="mt-1 text-xs text-white/70">By {item.created_by_name.trim()}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="bg-blue-600 text-white shadow-md hover:bg-blue-700"
            onClick={() => onEdit(item)}
          >
            Edit
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="shadow-md"
            onClick={() => onDelete(item)}
          >
            Delete
          </Button>
        </div>
      </div>
    </MediaOverlayCard>
  );
}
