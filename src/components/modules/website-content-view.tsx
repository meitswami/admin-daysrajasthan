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
import { CoverImageUploadField } from "@/components/ui/file-upload-field";
import { useToast } from "@/components/ui/toast";
import { PageMain, PageToolbar } from "@/components/ui/data-table";
import { MediaOverlayCard } from "@/components/shared/media-overlay-card";
import type { PlaceholderCategory } from "@/lib/constants/placeholder-images";
import type { DisplayMode, WebsiteContentItem } from "@/types/database";
import { HOTEL_CATEGORY_OPTIONS } from "@/types/itinerary-builder";
import { Grid3X3, List, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSystem } from "@/components/providers/system-provider";
import { canCreateMasterData } from "@/lib/rbac/ownership";
import {
  createMasterContent,
  deleteMasterContent,
  listMasterContent,
  updateMasterContent,
  type MasterContentEntity,
} from "@/lib/master-data/content-store";
import { listMasterCategories } from "@/lib/master-data/categories-store";

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
  const [hotelCategory, setHotelCategory] = useState("");
  const [hotelLocation, setHotelLocation] = useState("");
  const [priceDescription, setPriceDescription] = useState("");
  const [rating, setRating] = useState("0");
  const [reviewsCount, setReviewsCount] = useState("0");
  const [hotelImage, setHotelImage] = useState<string | null>(null);
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
    setHotelImage(null);
    setGoogleMapsUrl("");
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
    setVehicleType("");
    setCapacity("");
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
    setHotelCategory(item.category ?? "");
    setHotelLocation(item.location ?? "");
    setPriceDescription(item.price_description ?? "");
    setRating(String(item.rating ?? 0));
    setReviewsCount(String(item.reviews_count ?? 0));
    setHotelImage(item.image_url ?? null);
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
    const gallery =
      tab === "hotels"
        ? hotelImage
          ? [hotelImage]
          : []
        : galleryUrls.filter(Boolean).slice(0, 6);

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
      category: tab === "hotels" ? hotelCategory.trim() || null : null,
      location: tab === "hotels" ? hotelLocation.trim() || null : null,
      price_description: tab === "hotels" ? priceDescription.trim() || null : null,
      rating: tab === "hotels" ? parsedRating : null,
      reviews_count: tab === "hotels" ? parsedReviews : null,
      vehicle_type: tab === "vehicles" ? vehicleType.trim() || null : null,
      capacity: tab === "vehicles" ? capacity.trim() || null : null,
    };

    if (editing) {
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
            <div className="flex w-full flex-col gap-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <p className="text-sm font-semibold text-stone-700">Filter Hotels</p>
                {canCreate && (
                  <Button type="button" onClick={openAdd}>
                    <Plus className="h-4 w-4" /> Add Hotel
                  </Button>
                )}
              </div>
              <div className="grid w-full gap-3 sm:grid-cols-3">
                <div>
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
                <div>
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
                <div>
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
            </>
          )}
        </PageToolbar>

        {loading ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : tab === "hotels" || viewMode === "list" ? (
          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                {tab === "hotels" ? (
                  <tr>
                    <th className="px-3 py-2 w-12">S.No.</th>
                    <th className="px-3 py-2">Image</th>
                    <th className="px-3 py-2">Hotel Name</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="min-w-[220px] px-3 py-2">Price/Night</th>
                    <th className="px-3 py-2">Location</th>
                    <th className="px-3 py-2">Rating</th>
                    <th className="px-3 py-2">Reviews</th>
                    <th className="px-3 py-2">Google Reviews</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-3 py-2 w-12">S.No.</th>
                    <th className="px-3 py-2">Images</th>
                    <th className="px-3 py-2">{heading.singular} name</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((item, index) => {
                  const images = collectDisplayImages(item.image_url, item.gallery_urls, 4);
                  if (tab === "hotels") {
                    return (
                      <tr key={item.id}>
                        <td className="px-3 py-3 tabular-nums text-stone-500">{index + 1}</td>
                        <td className="px-3 py-3">
                          <ImageThumbRow urls={images.slice(0, 1)} size={48} max={1} />
                        </td>
                        <td className="px-3 py-3 font-semibold text-stone-900">{item.name}</td>
                        <td className="px-3 py-3 text-stone-700">{item.category || "—"}</td>
                        <td className="max-w-xs px-3 py-3 whitespace-pre-wrap text-stone-600">
                          {item.price_description?.trim() || "Not specified"}
                        </td>
                        <td className="px-3 py-3 text-stone-700">{item.location || "—"}</td>
                        <td className="px-3 py-3 tabular-nums text-stone-700">
                          {item.rating != null ? Number(item.rating).toFixed(1) : "—"}
                        </td>
                        <td className="px-3 py-3 tabular-nums text-stone-700">
                          {item.reviews_count ?? "—"}
                        </td>
                        <td className="px-3 py-3">
                          {item.google_maps_url ? (
                            <a
                              href={item.google_maps_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-blue-600 hover:underline"
                            >
                              View on Google
                            </a>
                          ) : (
                            <span className="text-stone-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusToggle
                              active={item.show_on_website}
                              onChange={(v) => void toggleStatus(item, v)}
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="bg-blue-600 text-white hover:bg-blue-700"
                              onClick={() => openEdit(item)}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => void remove(item)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
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
                        ) : item.subtitle ? (
                          <p className="text-sm text-stone-500">{item.subtitle}</p>
                        ) : null}
                        <p className="text-xs text-stone-400">
                          Created by {item.created_by_name ?? "Unknown"}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="bg-blue-600 text-white hover:bg-blue-700"
                            onClick={() => openEdit(item)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => void remove(item)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length && (
                  <tr>
                    <td
                      colSpan={tab === "hotels" ? 10 : 4}
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
                showStatus={tab === "hotels"}
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
          editing ? `Created by ${editing.created_by_name ?? "Unknown"}` : undefined
        }
        className={tab === "hotels" ? "sm:max-w-2xl" : "sm:max-w-lg"}
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
              <GalleryImagesField
                label="Vehicle images (up to 6)"
                value={galleryUrls}
                onChange={setGalleryUrls}
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

              <CoverImageUploadField
                label="Hotel Image"
                value={hotelImage}
                onChange={setHotelImage}
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
  onToggleStatus,
  onEdit,
  onDelete,
}: {
  item: WebsiteContentItem;
  imageCategory: PlaceholderCategory;
  showStatus: boolean;
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
