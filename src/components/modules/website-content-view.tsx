"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { CoverImageUploadField } from "@/components/ui/file-upload-field";
import { useToast } from "@/components/ui/toast";
import { PageMain, PageToolbar } from "@/components/ui/data-table";
import { MediaOverlayCard, MediaThumb } from "@/components/shared/media-overlay-card";
import type { PlaceholderCategory } from "@/lib/constants/placeholder-images";
import type { DisplayMode, WebsiteContentItem } from "@/types/database";
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

const TABS: { id: MasterContentEntity; label: string }[] = [
  { id: "destinations", label: "Destinations" },
  { id: "hotels", label: "Hotels" },
  { id: "vehicles", label: "Vehicles" },
];

export type MasterDataEntity = MasterContentEntity | "countries" | "cities";

const TAB_TITLES: Record<MasterContentEntity, { title: string; description: string }> = {
  destinations: {
    title: "Destinations",
    description: "Location master for India (replaces Cities) — packages & website",
  },
  hotels: { title: "Hotels", description: "Hotel inventory for costing & website" },
  vehicles: { title: "Vehicles", description: "Transport fleet master" },
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

export function WebsiteContentView({ entity }: { entity?: MasterDataEntity }) {
  const router = useRouter();
  const { show } = useToast();
  const { currentMember, dataMode } = useSystem();
  const initialTab = normalizeEntity(entity);
  const [tab, setTab] = useState<MasterContentEntity>(initialTab);
  const [viewMode, setViewMode] = useState<DisplayMode>("grid");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<WebsiteContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WebsiteContentItem | null>(null);
  const [locked, setLocked] = useState(false);

  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showOnWebsite, setShowOnWebsite] = useState(true);
  const [isTrending, setIsTrending] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("grid");

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
        (i.subtitle?.toLowerCase().includes(q) ?? false)
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
    setSubtitle("");
    setImageUrl(null);
    setShowOnWebsite(true);
    setIsTrending(false);
    setDisplayMode("grid");
    setModalOpen(true);
  }

  function openEdit(item: WebsiteContentItem) {
    const isLocked = isMasterDataLocked(currentMember, item);
    setEditing(item);
    setLocked(isLocked);
    setName(item.name);
    setSubtitle(item.subtitle ?? "");
    setImageUrl(item.image_url ?? null);
    setShowOnWebsite(item.show_on_website);
    setIsTrending(Boolean(item.is_trending));
    setDisplayMode(item.display_mode ?? "grid");
    setModalOpen(true);
  }

  async function save() {
    if (locked) return;
    if (!name.trim()) {
      show("Name is required");
      return;
    }

    if (editing) {
      if (!canEditMasterRecord(currentMember, editing)) {
        show("You can only edit your own records");
        return;
      }
      await updateMasterContent(tab, editing.id, {
        name,
        subtitle,
        image_url: imageUrl,
        show_on_website: showOnWebsite,
        is_trending: isTrending,
        display_mode: displayMode,
        country: "India",
      });
      show("Updated");
    } else {
      await createMasterContent(
        tab,
        {
          name,
          subtitle,
          image_url: imageUrl,
          show_on_website: showOnWebsite,
          is_trending: isTrending,
          display_mode: displayMode,
          country: "India",
        },
        currentMember
      );
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

  async function toggleWebsite(item: WebsiteContentItem, v: boolean) {
    if (!canEditMasterRecord(currentMember, item)) {
      show("View only — created by " + (item.created_by_name ?? "another user"));
      return;
    }
    await updateMasterContent(tab, item.id, { show_on_website: v });
    void refresh();
    show(v ? "Visible on website" : "Hidden from website");
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
            : "Destinations, hotels & vehicles for the public site"
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
                onToggleWebsite={toggleWebsite}
                onToggleTrending={toggleTrending}
                onEdit={openEdit}
                onDelete={remove}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => {
              const editable = canEditMasterRecord(currentMember, item);
              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <MediaThumb
                      imageUrl={item.image_url}
                      imageCategory={getImageCategory(tab)}
                      className="h-12 w-16 rounded-lg"
                      width={64}
                      height={48}
                    />
                    <div>
                      <p className="font-semibold text-stone-900">{item.name}</p>
                      {item.subtitle && <p className="text-sm text-stone-500">{item.subtitle}</p>}
                      <p className="text-xs text-stone-400">
                        Created by {item.created_by_name ?? "Unknown"}
                        {!editable && " · view only"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Toggle
                      checked={item.show_on_website}
                      onChange={(v) => void toggleWebsite(item, v)}
                      label="Website"
                      disabled={!editable}
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
                </div>
              );
            })}
          </div>
        )}
      </PageMain>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editing
            ? locked
              ? `View ${heading.title.slice(0, -1)}`
              : `Edit ${heading.title.slice(0, -1)}`
            : `Add ${heading.title.slice(0, -1)}`
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
          <div>
            <Label htmlFor="md-subtitle">Subtitle</Label>
            <Input
              id="md-subtitle"
              className="mt-1.5"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              disabled={locked}
            />
          </div>
          <CoverImageUploadField
            label="Image"
            value={imageUrl}
            onChange={(v) => setImageUrl(v)}
            disabled={locked}
          />
          <div>
            <Label>Display mode</Label>
            <Select
              className="mt-1.5"
              value={displayMode}
              onChange={(e) => setDisplayMode(e.target.value as DisplayMode)}
              disabled={locked}
            >
              <option value="grid">Grid</option>
              <option value="list">List</option>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showOnWebsite}
              onChange={(e) => setShowOnWebsite(e.target.checked)}
              disabled={locked}
            />
            Show on website
          </label>
          {tab === "destinations" && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isTrending}
                onChange={(e) => setIsTrending(e.target.checked)}
                disabled={locked}
              />
              Trending on home
            </label>
          )}
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

function ContentCard({
  item,
  imageCategory,
  showTrending,
  canEdit,
  canDelete,
  onToggleWebsite,
  onToggleTrending,
  onEdit,
  onDelete,
}: {
  item: WebsiteContentItem;
  imageCategory: PlaceholderCategory;
  showTrending: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onToggleWebsite: (item: WebsiteContentItem, v: boolean) => void;
  onToggleTrending: (item: WebsiteContentItem) => void;
  onEdit: (item: WebsiteContentItem) => void;
  onDelete: (item: WebsiteContentItem) => void;
}) {
  return (
    <MediaOverlayCard
      imageUrl={item.image_url}
      imageCategory={imageCategory}
      minHeightClass="min-h-[220px]"
    >
      <div className="flex justify-end">
        <Toggle
          checked={item.show_on_website}
          onChange={(v) => onToggleWebsite(item, v)}
          disabled={!canEdit}
        />
      </div>
      <div className="mt-auto space-y-3 pt-6">
        <div>
          <p className="text-lg font-bold drop-shadow-sm">{item.name}</p>
          {item.subtitle && <p className="text-sm text-white/90">{item.subtitle}</p>}
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
