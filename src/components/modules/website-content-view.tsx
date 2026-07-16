"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { PageMain, PageToolbar } from "@/components/ui/data-table";
import { MediaOverlayCard, MediaThumb } from "@/components/shared/media-overlay-card";
import type { PlaceholderCategory } from "@/lib/constants/placeholder-images";
import {
  countries as initCountries,
  destinations as initDestinations,
  cities as initCities,
  hotels as initHotels,
  vehicles as initVehicles,
} from "@/lib/data/website-content";
import type { WebsiteContentItem, DisplayMode, CountryRegion } from "@/types/database";
import { Grid3X3, List, Plus, Search, Star, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "countries", label: "Countries", data: initCountries },
  { id: "destinations", label: "Destinations", data: initDestinations },
  { id: "cities", label: "Cities", data: initCities },
  { id: "hotels", label: "Hotels", data: initHotels },
  { id: "vehicles", label: "Vehicles", data: initVehicles },
] as const;

export type MasterDataEntity = (typeof TABS)[number]["id"];
type TabId = MasterDataEntity;

const TAB_TITLES: Record<TabId, { title: string; description: string }> = {
  countries: { title: "Countries", description: "Country master for packages & website" },
  destinations: { title: "Destinations", description: "Destination / location master" },
  cities: { title: "Cities", description: "City master used in itineraries" },
  hotels: { title: "Hotels", description: "Hotel inventory for costing & website" },
  vehicles: { title: "Vehicles", description: "Transport fleet master" },
};

const COUNTRY_REGIONS: { id: CountryRegion; label: string }[] = [
  { id: "indian", label: "Indian" },
  { id: "international", label: "International" },
];

function getImageCategory(tab: TabId, item: WebsiteContentItem): PlaceholderCategory {
  if (tab === "countries") return item.region === "indian" ? "india" : "international";
  if (tab === "destinations") return "destination";
  if (tab === "cities") return "city";
  if (tab === "hotels") return "hotel";
  if (tab === "vehicles") return "vehicle";
  return "travel";
}

export function WebsiteContentView({ entity }: { entity?: MasterDataEntity }) {
  const params = useSearchParams();
  const router = useRouter();
  const fromQuery = params.get("tab") as TabId | null;
  const initialTab = entity ?? (fromQuery && TABS.some((t) => t.id === fromQuery) ? fromQuery : "countries");
  const { show } = useToast();
  const [tab, setTab] = useState<TabId>(initialTab);
  const [countryRegion, setCountryRegion] = useState<CountryRegion>("indian");
  const [viewMode, setViewMode] = useState<DisplayMode>("grid");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<Record<TabId, WebsiteContentItem[]>>({
    countries: initCountries,
    destinations: initDestinations,
    cities: initCities,
    hotels: initHotels,
    vehicles: initVehicles,
  });

  useEffect(() => {
    if (entity) setTab(entity);
  }, [entity]);

  function selectTab(next: TabId) {
    setTab(next);
    if (entity) {
      router.push(`/master-data/${next}`);
      return;
    }
    router.replace(`/website?tab=${next}`);
  }

  const heading = TAB_TITLES[tab];

  const items = useMemo(() => {
    const q = search.toLowerCase();
    return data[tab].filter((i) => {
      const matchSearch =
        !q || i.name.toLowerCase().includes(q) || (i.subtitle?.toLowerCase().includes(q) ?? false);
      const matchRegion = tab !== "countries" || i.region === countryRegion;
      return matchSearch && matchRegion;
    });
  }, [data, tab, search, countryRegion]);

  function toggleWebsite(id: string, v: boolean) {
    setData((prev) => ({
      ...prev,
      [tab]: prev[tab].map((i) => (i.id === id ? { ...i, show_on_website: v } : i)),
    }));
    show(v ? "Visible on website" : "Hidden from website");
  }

  function toggleTrending(id: string) {
    setData((prev) => ({
      ...prev,
      [tab]: prev[tab].map((i) => (i.id === id ? { ...i, is_trending: !i.is_trending } : i)),
    }));
    show("Trending updated");
  }

  return (
    <>
      <Header
        title={entity ? heading.title : "Website CMS"}
        description={
          entity
            ? heading.description
            : "Countries, destinations, cities, hotels & vehicles for the public site"
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
            href="/master-data/categories"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100"
          >
            Categories →
          </Link>
          <Link
            href="/itineraries"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100"
          >
            Packages →
          </Link>
        </div>

        {tab === "countries" && (
          <div className="flex flex-wrap items-center gap-2">
            {COUNTRY_REGIONS.map((region) => (
              <button
                key={region.id}
                type="button"
                onClick={() => setCountryRegion(region.id)}
                className={cn(
                  "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                  countryRegion === region.id
                    ? "border-amber-500 bg-amber-500 text-white"
                    : "border-stone-200 bg-white text-stone-600 hover:border-amber-200 hover:bg-amber-50"
                )}
              >
                {region.label}
              </button>
            ))}
          </div>
        )}

        <PageToolbar>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input placeholder="Search here…" className="h-10 pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-lg border border-stone-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn("rounded-md px-3 py-1.5", viewMode === "grid" ? "bg-amber-100 text-amber-900" : "text-stone-500")}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn("rounded-md px-3 py-1.5", viewMode === "list" ? "bg-amber-100 text-amber-900" : "text-stone-500")}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <Button><Plus className="h-4 w-4" /> Add New</Button>
          </div>
        </PageToolbar>

        {viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                imageCategory={getImageCategory(tab, item)}
                onToggleWebsite={toggleWebsite}
                onToggleTrending={toggleTrending}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <MediaThumb
                    imageUrl={item.image_url}
                    imageCategory={getImageCategory(tab, item)}
                    className="h-12 w-16 rounded-lg"
                    width={64}
                    height={48}
                  />
                  <div>
                    <p className="font-semibold text-stone-900">{item.name}</p>
                    {item.subtitle && <p className="text-sm text-stone-500">{item.subtitle}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Toggle checked={item.show_on_website} onChange={(v) => toggleWebsite(item.id, v)} label="Website" />
                  {tab === "destinations" && (
                    <button type="button" onClick={() => toggleTrending(item.id)} className="rounded-lg p-2 hover:bg-amber-50">
                      <Star className={cn("h-4 w-4", item.is_trending ? "fill-amber-500 text-amber-500" : "text-stone-400")} />
                    </button>
                  )}
                  <Button variant="ghost" size="sm"><Pencil className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageMain>
    </>
  );
}

function ContentCard({
  item,
  imageCategory,
  onToggleWebsite,
  onToggleTrending,
}: {
  item: WebsiteContentItem;
  imageCategory: PlaceholderCategory;
  onToggleWebsite: (id: string, v: boolean) => void;
  onToggleTrending: (id: string) => void;
}) {
  return (
    <MediaOverlayCard
      imageUrl={item.image_url}
      imageCategory={imageCategory}
      minHeightClass="min-h-[220px]"
    >
      <div className="flex justify-end">
        <Toggle checked={item.show_on_website} onChange={(v) => onToggleWebsite(item.id, v)} />
      </div>
      <div className="mt-auto space-y-3 pt-6">
        <div>
          <p className="text-lg font-bold drop-shadow-sm">{item.name}</p>
          {item.subtitle && <p className="text-sm text-white/90">{item.subtitle}</p>}
        </div>
        <div className="flex items-center justify-between">
          <Button size="sm" variant="secondary" className="h-9 w-9 rounded-full p-0 shadow-md">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <div className="flex items-center gap-2">
            {item.is_trending && <Badge className="bg-amber-500/90 text-white">Trending</Badge>}
            <button
              type="button"
              onClick={() => onToggleTrending(item.id)}
              className="rounded-full bg-black/40 p-2.5 backdrop-blur-sm"
            >
              <Star className={cn("h-4 w-4", item.is_trending ? "fill-amber-400 text-amber-400" : "text-white")} />
            </button>
          </div>
        </div>
      </div>
    </MediaOverlayCard>
  );
}
