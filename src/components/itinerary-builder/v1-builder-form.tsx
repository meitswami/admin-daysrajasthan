"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { RichTextToolbar } from "@/components/ui/rich-text-toolbar";
import { useToast } from "@/components/ui/toast";
import {
  emptyDay,
  OPTIONAL_INCLUSIONS,
  mergeOptionalIntoInclusionItems,
} from "@/lib/itinerary-builder/defaults";
import {
  durationLabelFromDayCount,
  durationLabelFromDays,
  formatInr,
  hotelBlockDaysFromItinerary,
  isDepartureLocation,
  lastDayDepartureError,
  MIN_ITINERARY_DAYS,
  parseDayCountFromDurationInput,
  resizeDaysPreservingCache,
  resolveCategoryTierPricing,
} from "@/lib/itinerary-builder/cost-engine";
import { todayIsoDate, travelDateValidationError } from "@/lib/itinerary-builder/travel-date";
import {
  buildCategoryPricing,
  lastTourCodeAmong,
  type PackageCatalogEntry,
} from "@/lib/itinerary-builder/package-catalog";
import { listClientItineraries } from "@/lib/itinerary-builder/storage";
import { normalizeSnapshot } from "@/lib/itinerary-builder/normalize";
import {
  learnAiSuggestionFromDay,
  searchAiSuggestions,
  type AiSuggestion,
} from "@/lib/itinerary-builder/ai-suggestions";
import {
  findHotelByOptionLabel,
  formatHotelOption,
  groupHotelsByCategory,
  hotelFromWebsiteItem,
  hotelPriceDescription,
  hotelsForLocation,
  sortHotelsByCategory,
  type HotelMasterItem,
} from "@/lib/itinerary-builder/hotel-master";
import {
  applyCategoryDayUpdate,
  dayViewForCategory,
  pruneCategoryHotelPicks,
} from "@/lib/itinerary-builder/category-hotels";
import { listMasterContent, updateMasterContent, createMasterContent } from "@/lib/master-data/content-store";
import { collectDisplayImages } from "@/components/ui/gallery-images-field";
import { uploadMasterImage } from "@/lib/supabase/storage-upload";
import { PLACEHOLDER_IMAGES } from "@/lib/constants/placeholder-images";
import { vehicleDetailBlocks } from "@/lib/master-data/vehicle-providers";
import type { WebsiteContentItem } from "@/types/database";
import { useSystem } from "@/components/providers/system-provider";
import {
  HOTEL_CATEGORY_OPTIONS,
  type HotelCategoryKey,
  type ItineraryDay,
  type ItinerarySnapshot,
  type PriceBasis,
} from "@/types/itinerary-builder";
import { cn } from "@/lib/utils";
import {
  Check,
  Coffee,
  FileText,
  GripVertical,
  IndianRupee,
  Info,
  Lightbulb,
  MapPin,
  Moon,
  Plus,
  RefreshCw,
  Save,
  StickyNote,
  Trash2,
  Eye,
  Car,
  X,
  Loader2,
} from "lucide-react";

const MAX_DAY_IMAGES = 6;
const MAX_LOCATION_IMAGES = 6;

/** Always available for last-day overnight logic even if missing from master. */
const DEPARTURE_LOCATION = "Departure";

type LocationCatalogEntry = {
  id?: string;
  name: string;
  photos: string[];
};

function photosForLocation(
  catalog: LocationCatalogEntry[],
  location: string | null | undefined
): string[] {
  if (!location?.trim()) return [];
  const q = location.trim().toLowerCase();
  const hit = catalog.find((e) => e.name.toLowerCase() === q);
  return (hit?.photos ?? []).slice(0, MAX_DAY_IMAGES);
}

function ensureDepartureInCatalog(entries: LocationCatalogEntry[]): LocationCatalogEntry[] {
  if (entries.some((e) => e.name.trim().toLowerCase() === "departure")) {
    return entries;
  }
  return [...entries, { name: DEPARTURE_LOCATION, photos: [] }].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

function SortableDayCard({
  id,
  children,
}: {
  id: string;
  children: (dragHandle: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.88 : 1,
    zIndex: isDragging ? 20 : undefined,
    position: "relative",
  };
  const dragHandle = (
    <button
      type="button"
      className="inline-flex cursor-grab touch-none items-center justify-center rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 active:cursor-grabbing"
      aria-label="Drag to reorder day"
      title="Drag to reorder"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-5 w-5" />
    </button>
  );
  return (
    <div ref={setNodeRef} style={style}>
      {children(dragHandle)}
    </div>
  );
}

/** Real master-data vehicle names only (no hardcoded category dummies). */
function vehicleOptions(catalog: WebsiteContentItem[]): string[] {
  const names = new Set<string>();
  for (const v of catalog) {
    const name = v.name?.trim();
    if (name) names.add(name);
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function findVehicleByName(
  catalog: WebsiteContentItem[],
  name: string
): WebsiteContentItem | null {
  const q = name.trim().toLowerCase();
  return catalog.find((v) => v.name.trim().toLowerCase() === q) ?? null;
}

function mergeOptionalInclusions(base: string[], keys: string[]): string[] {
  const optionalLabels = OPTIONAL_INCLUSIONS.filter((o) => keys.includes(o.key)).map((o) => o.label);
  const withoutOptional = base.filter(
    (line) => !OPTIONAL_INCLUSIONS.some((o) => o.label === line)
  );
  return [...withoutOptional, ...optionalLabels];
}

function DayTitleSuggest({
  value,
  onChange,
  onReplace,
}: {
  value: string;
  onChange: (v: string) => void;
  onReplace: (s: AiSuggestion) => void;
}) {
  const [open, setOpen] = useState(false);
  const [matches, setMatches] = useState<AiSuggestion[]>([]);

  useEffect(() => {
    if (value.trim().length < 2) {
      setMatches([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    void searchAiSuggestions(value).then((found) => {
      if (cancelled) return;
      setMatches(found);
      setOpen(found.length > 0);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <div className="relative space-y-2">
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (value.trim().length >= 2) {
              void searchAiSuggestions(value).then((found) => {
                setMatches(found);
                setOpen(found.length > 0);
              });
            }
          }}
          onBlur={() => {
            // Do not auto-create master suggestions from title keystrokes
            setOpen(false);
          }}
          placeholder="Day title"
          className="flex-1"
        />
      </div>
      {open && matches.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
              <Lightbulb className="h-4 w-4" />
              AI Suggestions for &apos;{value}&apos;
              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                {matches.length} found
              </span>
            </div>
            <button
              type="button"
              className="rounded p-1 text-stone-500 hover:bg-white"
              onClick={() => setOpen(false)}
              aria-label="Close suggestions"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {matches.slice(0, 20).map((s) => (
              <div
                key={s.id}
                className="flex items-start gap-3 rounded-lg border border-stone-200 bg-white p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-stone-900">{s.title}</p>
                  <p className="mt-1 line-clamp-3 text-xs text-stone-600">{s.description}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="shrink-0 bg-blue-600 hover:bg-blue-700"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onReplace(s);
                    setOpen(false);
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Replace
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Pick a pre-existing master itinerary by title — tour code updates only on a real package change. */
function PackageTitleSuggest({
  value,
  onChange,
  packages,
  currentPackageId,
  onSelectPackage,
}: {
  value: string;
  onChange: (v: string) => void;
  packages: PackageCatalogEntry[];
  currentPackageId: string | null;
  onSelectPackage?: (packageId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (q.length < 2) return [];
    return packages
      .filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.tour_code.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [value, packages]);

  return (
    <div className="relative flex-1">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (value.trim().length >= 2) setOpen(true);
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
        placeholder="Itinerary title"
      />
      {open && matches.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-stone-200 bg-white p-1 shadow-lg">
          {matches.map((pkg) => {
            const selected = currentPackageId === pkg.id;
            return (
              <button
                key={pkg.id}
                type="button"
                className={cn(
                  "flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left hover:bg-blue-50",
                  selected && "bg-blue-50"
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(pkg.title);
                  setOpen(false);
                  if (!selected) onSelectPackage?.(pkg.id);
                }}
              >
                <span className="text-sm font-medium text-stone-900">{pkg.title}</span>
                <span className="font-mono text-xs text-stone-500">
                  {pkg.tour_code} · {pkg.duration_label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SelectedVehicleChip({
  name,
  vehicle,
  onRemove,
}: {
  name: string;
  vehicle: WebsiteContentItem | null;
  onRemove: () => void;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const blocks = vehicleDetailBlocks(vehicle);

  useEffect(() => {
    if (!infoOpen) return;
    function onDocPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setInfoOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setInfoOpen(false);
    }
    document.addEventListener("mousedown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [infoOpen]);

  return (
    <div
      ref={rootRef}
      className="relative flex items-center justify-between gap-2 rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-900"
    >
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <div className="flex shrink-0 items-center gap-1">
        <div className="relative">
          <button
            type="button"
            className={cn(
              "rounded-full p-1 text-violet-600 hover:bg-white hover:text-blue-600",
              infoOpen && "bg-white text-blue-600"
            )}
            aria-label="Vehicle details"
            aria-expanded={infoOpen}
            onClick={() => setInfoOpen((v) => !v)}
          >
            <Info className="h-3.5 w-3.5" />
          </button>
          {infoOpen && (
            <div
              role="dialog"
              aria-label="Vehicle details"
              className="absolute right-0 bottom-full z-20 mb-2 w-72 rounded-lg border border-stone-200 bg-white p-3 text-left shadow-lg"
            >
              <div className="max-h-64 space-y-3 overflow-y-auto">
                {blocks.map((block) => (
                  <div key={block.title}>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                      {block.title}
                    </p>
                    <dl className="space-y-1">
                      {block.lines.map((line) => (
                        <div key={line.label} className="text-xs leading-relaxed text-stone-800">
                          <dt className="inline font-semibold">{line.label}: </dt>
                          <dd className="inline">{line.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          className="rounded-md p-1 text-red-500 hover:bg-white hover:text-red-700"
          aria-label={`Remove ${name}`}
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function SelectedHotelCard({
  label,
  hotel,
  onClear,
  className,
}: {
  label: string;
  hotel: HotelMasterItem | null;
  onClear: () => void;
  className?: string;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const priceText = hotelPriceDescription(hotel);

  useEffect(() => {
    if (!infoOpen) return;
    function onDocPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setInfoOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setInfoOpen(false);
    }
    document.addEventListener("mousedown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [infoOpen]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={hotel?.image_url ?? PLACEHOLDER_IMAGES.hotel}
        alt=""
        className="h-10 w-10 shrink-0 rounded object-cover"
      />
      <span className="min-w-0 flex-1 truncate text-xs font-medium text-stone-800">
        {hotel?.name ?? label}
      </span>
      <div className="relative shrink-0">
        <button
          type="button"
          className={cn(
            "rounded-full p-1 text-stone-500 hover:bg-white hover:text-blue-600",
            infoOpen && "bg-white text-blue-600"
          )}
          aria-label="Price description"
          aria-expanded={infoOpen}
          onClick={() => setInfoOpen((v) => !v)}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
        {infoOpen && (
          <div
            role="dialog"
            aria-label="Price description"
            className="absolute right-0 bottom-full z-20 mb-2 w-64 rounded-lg border border-stone-200 bg-white p-3 text-left shadow-lg"
          >
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
              Price Description
            </p>
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-stone-800">
              {priceText}
            </p>
          </div>
        )}
      </div>
      <button
        type="button"
        className="shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold text-stone-600 hover:bg-white hover:text-stone-900"
        onClick={onClear}
      >
        Clear
      </button>
    </div>
  );
}

function HotelSelectOptions({
  hotels,
  excludeLabel,
}: {
  hotels: HotelMasterItem[];
  excludeLabel: string | null;
}) {
  const groups = useMemo(() => {
    const list = excludeLabel
      ? hotels.filter((h) => formatHotelOption(h) !== excludeLabel)
      : hotels;
    return groupHotelsByCategory(list);
  }, [hotels, excludeLabel]);

  return (
    <>
      {groups.map((group) => (
        <optgroup key={group.key} label={group.label}>
          {group.hotels.map((h) => (
            <option key={h.id} value={formatHotelOption(h)}>
              {formatHotelOption(h)}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

function NightHotelCard({
  day,
  nightNo,
  onChange,
  hotelCatalog,
}: {
  day: ItineraryDay;
  nightNo: string;
  onChange: (updater: (d: ItineraryDay) => ItineraryDay) => void;
  hotelCatalog: HotelMasterItem[];
}) {
  /** Hotels for this night’s location only — never spill other cities into the picker. */
  const locationHotels = useMemo(() => {
    const byLocation = hotelsForLocation(day.location, hotelCatalog);
    return sortHotelsByCategory(byLocation);
  }, [day.location, hotelCatalog]);

  const breakfastHotel1 = day.breakfast_hotels[0];
  const breakfastHotel2 = day.breakfast_hotels[1];

  /**
   * Lunch/dinner options follow Breakfast selection order (Hotel 1, then Hotel 2),
   * not master-catalog order — so order is consistent across devices.
   */
  const mealCascadeOptions = useMemo(() => {
    const breakfastSelected = [breakfastHotel1, breakfastHotel2].filter(Boolean) as string[];
    if (breakfastSelected.length === 0) return locationHotels;
    const byLabel = new Map(locationHotels.map((h) => [formatHotelOption(h), h]));
    const ordered: HotelMasterItem[] = [];
    for (const label of breakfastSelected) {
      const fromCatalog = byLabel.get(label) ?? findHotelByOptionLabel(label, hotelCatalog);
      if (fromCatalog && !ordered.some((h) => h.id === fromCatalog.id)) {
        ordered.push(fromCatalog);
      }
    }
    return ordered.length ? ordered : locationHotels;
  }, [breakfastHotel1, breakfastHotel2, locationHotels, hotelCatalog]);

  function setMeal(
    field: "breakfast_hotels" | "lunch_hotels" | "dinner_hotels",
    slot: 0 | 1,
    value: string
  ) {
    onChange((d) => {
      const pair: [string | null, string | null] = [...d[field]];
      pair[slot] = value || null;
      // unique: hotel 1 cannot equal hotel 2
      if (slot === 0 && pair[1] === pair[0]) pair[1] = null;
      if (slot === 1 && pair[0] === pair[1]) pair[1] = null;
      const next = { ...d, [field]: pair };
      if (field === "dinner_hotels" && slot === 0) next.hotel_name = value || null;
      if (field === "breakfast_hotels") {
        // clear lunch/dinner picks that are no longer allowed
        const allowed = [pair[0], pair[1]].filter(Boolean) as string[];
        if (allowed.length > 0) {
          next.lunch_hotels = [
            allowed.includes(d.lunch_hotels[0] ?? "") ? d.lunch_hotels[0] : null,
            allowed.includes(d.lunch_hotels[1] ?? "") ? d.lunch_hotels[1] : null,
          ];
          next.dinner_hotels = [
            allowed.includes(d.dinner_hotels[0] ?? "") ? d.dinner_hotels[0] : null,
            allowed.includes(d.dinner_hotels[1] ?? "") ? d.dinner_hotels[1] : null,
          ];
        }
      }
      return next;
    });
  }

  function setStayHotel(slot: 0 | 1, value: string) {
    onChange((d) => {
      const pair: [string | null, string | null] = [...d.breakfast_hotels];
      pair[slot] = value || null;
      if (pair[0] && pair[0] === pair[1]) pair[1] = null;
      return {
        ...d,
        breakfast_hotels: pair,
        hotel_name: pair[0] || d.hotel_name,
      };
    });
  }

  function clearSelectedHotel(
    field: "breakfast_hotels" | "lunch_hotels" | "dinner_hotels",
    label: string
  ) {
    onChange((d) => {
      const pair: [string | null, string | null] = [
        d[field][0] === label ? null : d[field][0],
        d[field][1] === label ? null : d[field][1],
      ];
      const next = { ...d, [field]: pair };
      if (field === "dinner_hotels") next.hotel_name = pair[0] || null;
      if (field === "breakfast_hotels") {
        const allowed = [pair[0], pair[1]].filter(Boolean) as string[];
        if (allowed.length > 0) {
          next.lunch_hotels = [
            allowed.includes(d.lunch_hotels[0] ?? "") ? d.lunch_hotels[0] : null,
            allowed.includes(d.lunch_hotels[1] ?? "") ? d.lunch_hotels[1] : null,
          ];
          next.dinner_hotels = [
            allowed.includes(d.dinner_hotels[0] ?? "") ? d.dinner_hotels[0] : null,
            allowed.includes(d.dinner_hotels[1] ?? "") ? d.dinner_hotels[1] : null,
          ];
        }
      }
      return next;
    });
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
        <span className="rounded-full bg-blue-600 px-3 py-1 text-sm font-semibold text-white">
          Night - {nightNo}
        </span>
        <label className="inline-flex items-center gap-2 text-sm font-medium text-blue-700">
          <input
            type="checkbox"
            checked={day.epai_plan_only}
            onChange={(e) =>
              onChange((d) => ({ ...d, epai_plan_only: e.target.checked }))
            }
          />
          EPAI Plan Only
        </label>
      </div>

      {day.guest_self_booked_hotel ? (
        <div className="mb-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm font-medium text-stone-700">
          No hotels will be booked for this day. Guest will arrange their own accommodation.
        </div>
      ) : day.epai_plan_only ? (
        <div className="mb-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <div className="mb-2 flex items-center gap-2 font-semibold text-stone-800">
            <Moon className="h-4 w-4 text-blue-600" />
            Stay Only - Accommodation Only
          </div>
          <div className="mb-3 flex items-center gap-1 text-sm text-stone-600">
            <MapPin className="h-3.5 w-3.5 text-blue-600" />
            {day.location || "Select location on the day card"}
          </div>
          <p className="mb-2 text-xs font-medium text-stone-600">Hotel (Up to 2 options)</p>
          <div className="space-y-2">
            {[0, 1].map((slot) => {
              const other = day.breakfast_hotels[(slot === 0 ? 1 : 0) as 0 | 1];
              return (
                <Select
                  key={slot}
                  value={day.breakfast_hotels[slot as 0 | 1] ?? ""}
                  onChange={(e) => setStayHotel(slot as 0 | 1, e.target.value)}
                >
                  <option value="">Hotel {slot + 1}</option>
                  <HotelSelectOptions hotels={locationHotels} excludeLabel={other} />
                </Select>
              );
            })}
          </div>
          {(day.breakfast_hotels[0] || day.breakfast_hotels[1]) && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {day.breakfast_hotels.filter(Boolean).map((label) => (
                <SelectedHotelCard
                  key={label}
                  label={label!}
                  hotel={findHotelByOptionLabel(label!, hotelCatalog)}
                  onClear={() => clearSelectedHotel("breakfast_hotels", label!)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <div className="mb-3 flex items-center gap-1 text-sm font-medium text-stone-700">
            <MapPin className="h-3.5 w-3.5 text-blue-600" />
            {day.location || "Select location on the day card"}
          </div>
          {(
            [
              ["breakfast_hotels", "Breakfast Hotel", "text-orange-500", locationHotels],
              ["lunch_hotels", "Lunch Hotel", "text-emerald-600", mealCascadeOptions],
              ["dinner_hotels", "Dinner Hotel", "text-red-500", mealCascadeOptions],
            ] as const
          ).map(([field, label, iconClass, opts]) => (
            <div key={field} className="mb-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-stone-600">
                <Coffee className={cn("h-3.5 w-3.5", iconClass)} />
                {label} (Up to 2 options)
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {[0, 1].map((slot) => {
                  const other = day[field][(slot === 0 ? 1 : 0) as 0 | 1];
                  return (
                    <Select
                      key={slot}
                      value={day[field][slot as 0 | 1] ?? ""}
                      onChange={(e) => setMeal(field, slot as 0 | 1, e.target.value)}
                    >
                      <option value="">
                        {label} {slot + 1}
                      </option>
                      <HotelSelectOptions hotels={opts} excludeLabel={other} />
                    </Select>
                  );
                })}
              </div>
              {(day[field][0] || day[field][1]) && (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {day[field].filter(Boolean).map((selectedLabel) => (
                    <SelectedHotelCard
                      key={`${field}-${selectedLabel}`}
                      label={selectedLabel!}
                      hotel={findHotelByOptionLabel(selectedLabel!, hotelCatalog)}
                      onClear={() => clearSelectedHotel(field, selectedLabel!)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <label className="flex items-start gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          className="mt-1"
          checked={day.guest_self_booked_hotel}
          onChange={(e) =>
            onChange((d) => ({ ...d, guest_self_booked_hotel: e.target.checked }))
          }
        />
        <span>
          If guest has already booked hotel by own or self then please click on this checkbox
        </span>
      </label>
    </div>
  );
}

/** Fields that gate the Save button when `saveRequiresChanges` is on. */
function itineraryEditFingerprint(snapshot: ItinerarySnapshot): string {
  const s = normalizeSnapshot(snapshot);
  return JSON.stringify({
    title: s.header.title,
    alternate_titles: s.header.alternate_titles,
    days: s.days.map((d) => ({
      day_uuid: d.day_uuid,
      day_title: d.day_title,
      alternate_day_titles: d.alternate_day_titles,
      day_description: d.day_description,
      location: d.location ?? "",
    })),
  });
}

export function V1BuilderForm({
  snapshot,
  onChange,
  showStepHeader,
  onBack,
  onSave,
  onPreview,
  saveLabel = "Save New Itinerary",
  saveRequiresChanges = false,
  packageCatalog = [],
  onSelectPackage,
}: {
  snapshot: ItinerarySnapshot;
  onChange: (next: ItinerarySnapshot) => void;
  showStepHeader?: boolean;
  onBack?: () => void;
  onSave: () => void;
  onPreview: () => void;
  saveLabel?: string;
  /** When true, hide Save until title / description / location / day add-delete changes. */
  saveRequiresChanges?: boolean;
  /** Master packages — used to switch pre-existing itinerary from the title field. */
  packageCatalog?: PackageCatalogEntry[];
  /** Called when a different pre-existing package is picked (tour code should update). */
  onSelectPackage?: (packageId: string) => void;
}) {
  const { show } = useToast();
  const { currentMember } = useSystem();
  const s = normalizeSnapshot(snapshot);
  const baselineFingerprintRef = useRef(
    saveRequiresChanges ? itineraryEditFingerprint(snapshot) : null
  );
  const hasItineraryEdits = useMemo(() => {
    if (!saveRequiresChanges || baselineFingerprintRef.current == null) return true;
    return itineraryEditFingerprint(s) !== baselineFingerprintRef.current;
  }, [s, saveRequiresChanges]);
  /** Keeps trimmed day cards so Duration typos can restore prior content. */
  const dayCacheRef = useRef<ItineraryDay[]>(s.days.map((d) => ({ ...d })));
  const [durationFocused, setDurationFocused] = useState(false);
  const [durationDraft, setDurationDraft] = useState("");
  const itineraryNote = (s.internal_notes || "").trim();
  const [noteOpen, setNoteOpen] = useState(() => Boolean(itineraryNote));
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [locationCatalog, setLocationCatalog] = useState<LocationCatalogEntry[]>(() =>
    ensureDepartureInCatalog([])
  );
  const [hotelCatalog, setHotelCatalog] = useState<HotelMasterItem[]>([]);
  const [vehicleCatalog, setVehicleCatalog] = useState<WebsiteContentItem[]>([]);
  const [uploadingDayImage, setUploadingDayImage] = useState<number | null>(null);
  const locs = useMemo(
    () => locationCatalog.map((e) => e.name),
    [locationCatalog]
  );
  const vehicles = useMemo(() => vehicleOptions(vehicleCatalog), [vehicleCatalog]);
  const dayIds = useMemo(() => s.days.map((d) => d.day_uuid), [s.days]);
  const lastDayMissingDeparture = Boolean(lastDayDepartureError(s.days));
  const daySensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const selectedKeys = s.category_pricing.map((c) => c.category_key) as HotelCategoryKey[];
  /** Night cards match days; last day omitted only when location is Departure. */
  const hotelBlockDays = hotelBlockDaysFromItinerary(s.days);
  const isThreeDayTwoNight = s.days.length === 3;
  const priceBasisOptions: [PriceBasis, string][] = isThreeDayTwoNight
    ? [["whole_group", "Whole Group/Family"]]
    : [
        ["per_person", "Per Person"],
        ["whole_group", "Whole Group/Family"],
      ];
  const vehicleList = s.vehicle_types?.length
    ? s.vehicle_types.slice(0, 1)
    : s.vehicle_type
      ? [s.vehicle_type]
      : [];

  const lastTourCodeTip = useMemo(() => {
    const fromPackages = packageCatalog.map((p) => p.tour_code);
    const fromQuotes = listClientItineraries().map((r) => r.tour_code);
    return lastTourCodeAmong([...fromPackages, ...fromQuotes], "WRT");
  }, [packageCatalog]);

  /** Single selected vehicle (multi-select is not allowed). */
  const selectedVehicle = vehicleList[0] ?? "";

  useEffect(() => {
    if (itineraryNote) setNoteOpen(true);
  }, [itineraryNote]);

  useEffect(() => {
    if (!isThreeDayTwoNight || s.price_basis === "whole_group") return;
    onChange(normalizeSnapshot({ ...s, price_basis: "whole_group" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-force when package length or basis changes
  }, [isThreeDayTwoNight, s.price_basis, onChange]);

  useEffect(() => {
    let cancelled = false;
    void listMasterContent("destinations").then((items) => {
      if (cancelled) return;
      const byName = new Map<string, LocationCatalogEntry>();
      for (const item of items) {
        const name = item.name.trim();
        if (!name) continue;
        byName.set(name.toLowerCase(), {
          id: item.id,
          name,
          photos: collectDisplayImages(item.image_url, item.gallery_urls, MAX_LOCATION_IMAGES),
        });
      }
      setLocationCatalog(
        ensureDepartureInCatalog(
          Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name))
        )
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void listMasterContent("hotels").then((items) => {
      if (cancelled) return;
      const mapped = items
        .map(hotelFromWebsiteItem)
        .filter((h): h is HotelMasterItem => Boolean(h));
      setHotelCatalog(mapped);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void listMasterContent("vehicles").then((items) => {
      if (cancelled) return;
      setVehicleCatalog(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Drop legacy category aliases (Sedan/SUV/…) that are no longer in master data. */
  useEffect(() => {
    if (!vehicleCatalog.length || !selectedVehicle) return;
    const names = new Set(vehicleCatalog.map((v) => v.name.trim().toLowerCase()));
    if (names.has(selectedVehicle.trim().toLowerCase())) return;
    setVehicle("");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clear once when catalog arrives
  }, [vehicleCatalog]);

  function patch(partial: Partial<ItinerarySnapshot>) {
    onChange(normalizeSnapshot({ ...s, ...partial }));
  }

  /** Rebuild per-category package / discount / booking / final totals */
  function pricingFrom(
    base: ItinerarySnapshot,
    keys: HotelCategoryKey[] = selectedKeys,
    discounts?: Partial<Record<HotelCategoryKey, number | null>>,
    overrides?: Partial<Record<HotelCategoryKey, number | null>>
  ) {
    const nextDiscounts: Partial<Record<HotelCategoryKey, number | null>> = {
      ...discounts,
    };
    const nextOverrides: Partial<Record<HotelCategoryKey, number | null>> = {
      ...overrides,
    };
    for (const tier of base.category_pricing) {
      if (nextDiscounts[tier.category_key] === undefined) {
        nextDiscounts[tier.category_key] = tier.discount_price;
      }
      // Preserve each category's own package price independently (including 0).
      if (nextOverrides[tier.category_key] === undefined) {
        nextOverrides[tier.category_key] =
          tier.manual_override != null ? tier.manual_override : tier.package_price;
      }
    }
    const category_pricing = buildCategoryPricing(base, keys, nextDiscounts, nextOverrides);
    return {
      category_pricing,
      final_price: category_pricing[0]?.grand_total ?? null,
    };
  }

  function patchHeader(partial: Partial<ItinerarySnapshot["header"]>) {
    patch({
      header: {
        ...s.header,
        ...partial,
        duration_label: durationLabelFromDays(s.days),
      },
    });
  }

  function setTitles(titles: string[]) {
    const [primary, ...rest] = titles.length ? titles : [""];
    patchHeader({ title: primary ?? "", alternate_titles: rest });
  }

  function updateDay(index: number, updater: (d: ItineraryDay) => ItineraryDay) {
    const days = s.days.map((d, i) => (i === index ? updater(d) : d));
    days.forEach((d, i) => {
      dayCacheRef.current[i] = d;
    });
    const next = {
      ...s,
      days,
      header: { ...s.header, duration_label: durationLabelFromDays(days) },
    };
    patch({
      days,
      header: next.header,
      ...pricingFrom(next),
    });
  }

  function setDayCount(dayCount: number) {
    if (!Number.isFinite(dayCount) || dayCount < MIN_ITINERARY_DAYS) return;
    if (dayCount === s.days.length) {
      patch({
        header: { ...s.header, duration_label: durationLabelFromDays(s.days) },
      });
      return;
    }
    const { days, cache } = resizeDaysPreservingCache(
      s.days,
      dayCount,
      dayCacheRef.current,
      emptyDay
    );
    dayCacheRef.current = cache;
    const next = {
      ...s,
      days,
      header: { ...s.header, duration_label: durationLabelFromDays(days) },
    };
    patch({
      days,
      header: next.header,
      ...pricingFrom(next),
    });
  }

  function onDurationInputChange(raw: string) {
    setDurationDraft(raw);
    const parsed = parseDayCountFromDurationInput(raw);
    if (parsed != null && parsed >= MIN_ITINERARY_DAYS) {
      setDayCount(parsed);
    }
  }

  function onDurationFocus() {
    setDurationFocused(true);
    setDurationDraft(String(s.days.length).padStart(2, "0"));
  }

  function onDurationBlur() {
    const parsed = parseDayCountFromDurationInput(durationDraft);
    const finalCount =
      parsed != null && parsed >= MIN_ITINERARY_DAYS
        ? parsed
        : Math.max(MIN_ITINERARY_DAYS, s.days.length);
    setDayCount(finalCount);
    setDurationFocused(false);
    setDurationDraft("");
  }

  function addDay() {
    const days = [...s.days, emptyDay(s.days.length + 1)];
    days.forEach((d, i) => {
      dayCacheRef.current[i] = d;
    });
    const next = {
      ...s,
      days,
      header: { ...s.header, duration_label: durationLabelFromDays(days) },
    };
    patch({
      days,
      header: next.header,
      ...pricingFrom(next),
    });
  }

  function removeDay(index: number) {
    if (s.days.length <= 1) return;
    // Snapshot full list first so Duration restore can bring trimmed days back.
    s.days.forEach((d, i) => {
      dayCacheRef.current[i] = d;
    });
    const days = s.days
      .filter((_, i) => i !== index)
      .map((d, i) => ({ ...d, day_number: i + 1 }));
    for (let i = 0; i < days.length; i++) {
      dayCacheRef.current[i] = days[i];
    }
    const next = {
      ...s,
      days,
      header: { ...s.header, duration_label: durationLabelFromDays(days) },
    };
    patch({
      days,
      header: next.header,
      ...pricingFrom(next),
    });
  }

  function reorderDays(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    const days = arrayMove(s.days, fromIndex, toIndex).map((d, i) => ({
      ...d,
      day_number: i + 1,
    }));
    days.forEach((d, i) => {
      dayCacheRef.current[i] = d;
    });
    const next = {
      ...s,
      days,
      header: { ...s.header, duration_label: durationLabelFromDays(days) },
    };
    patch({
      days,
      header: next.header,
      ...pricingFrom(next),
    });
  }

  function onDayDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = s.days.findIndex((d) => d.day_uuid === active.id);
    const toIndex = s.days.findIndex((d) => d.day_uuid === over.id);
    reorderDays(fromIndex, toIndex);
  }

  function requireLastDayDeparture(): boolean {
    const err = lastDayDepartureError(s.days);
    if (err) {
      show(err);
      return false;
    }
    return true;
  }

  function requireTravelDate(): boolean {
    const err = travelDateValidationError(s.client.travel_date);
    if (err) {
      show(err);
      return false;
    }
    return true;
  }

  function handleSaveClick() {
    if (!requireTravelDate()) return;
    if (!requireLastDayDeparture()) return;
    onSave();
  }

  function handlePreviewClick() {
    if (!requireTravelDate()) return;
    if (!requireLastDayDeparture()) return;
    onPreview();
  }

  function toggleCategory(key: HotelCategoryKey) {
    let keys = [...selectedKeys];
    if (keys.includes(key)) keys = keys.filter((k) => k !== key);
    else if (keys.length >= 2) return;
    else keys = [...keys, key];
    const days = s.days.map((d) => pruneCategoryHotelPicks(d, keys));
    const next = { ...s, days };
    patch({
      days,
      ...pricingFrom(next, keys),
    });
  }

  function updateTier(
    categoryKey: HotelCategoryKey,
    field: "package_price" | "discount_price" | "booking_amount",
    value: number | null
  ) {
    if (field === "booking_amount") {
      patch({
        category_pricing: s.category_pricing.map((t) =>
          t.category_key === categoryKey ? { ...t, booking_amount: value } : t
        ),
      });
      return;
    }
    // Update only the targeted category so Deluxe / Super Deluxe prices stay independent.
    if (field === "package_price") {
      const package_price =
        value != null && Number.isFinite(value) ? Math.max(0, value) : 0;
      const category_pricing = s.category_pricing.map((t) => {
        if (t.category_key !== categoryKey) return t;
        const { grand_total, booking_amount } = resolveCategoryTierPricing({
          package_price,
          discount_price: t.discount_price,
          manual_override: null,
        });
        return {
          ...t,
          package_price,
          manual_override: package_price > 0 ? package_price : null,
          grand_total,
          booking_amount,
        };
      });
      patch({
        category_pricing,
        final_price: category_pricing[0]?.grand_total ?? null,
      });
      return;
    }
    const discounts: Partial<Record<HotelCategoryKey, number | null>> = {
      [categoryKey]: value,
    };
    patch(pricingFrom(s, selectedKeys, discounts));
  }

  function syncVehicles(vehicle_types: string[]) {
    // Single vehicle only — keep the first entry if multiple are passed.
    // Store the master-data vehicle name (not a category alias).
    const unique = vehicle_types.filter(Boolean).slice(0, 1);
    const primary = unique[0] ?? null;
    const days = s.days.map((d) => ({
      ...d,
      vehicle_type: primary,
    }));
    const next = {
      ...s,
      days,
      vehicle_types: unique,
      vehicle_type: primary,
    };
    patch({
      days,
      vehicle_types: unique,
      vehicle_type: primary,
      ...pricingFrom(next),
    });
  }

  function setVehicle(v: string) {
    syncVehicles(v ? [v] : []);
  }

  function toggleOptional(key: string) {
    const has = s.optional_inclusion_keys.includes(key);
    const optional_inclusion_keys = has
      ? s.optional_inclusion_keys.filter((k) => k !== key)
      : [...s.optional_inclusion_keys, key];
    const inclusion_items = mergeOptionalIntoInclusionItems(
      s.inclusion_items,
      optional_inclusion_keys
    );
    patch({
      optional_inclusion_keys,
      inclusion_items,
      inclusions: mergeOptionalInclusions(s.inclusions, optional_inclusion_keys),
    });
  }

  async function syncImagesToLocation(location: string | null | undefined, urls: string[]) {
    if (!location?.trim()) return;
    const q = location.trim().toLowerCase();
    let entry = locationCatalog.find((e) => e.name.toLowerCase() === q);

    // Resolve / create a real Master Data → Locations row so uploads persist.
    if (!entry?.id) {
      try {
        const items = await listMasterContent("destinations");
        const existing = items.find((i) => i.name.trim().toLowerCase() === q);
        if (existing) {
          entry = {
            id: existing.id,
            name: existing.name,
            photos: collectDisplayImages(
              existing.image_url,
              existing.gallery_urls,
              MAX_LOCATION_IMAGES
            ),
          };
          setLocationCatalog((prev) => {
            const without = prev.filter((e) => e.name.toLowerCase() !== q);
            return ensureDepartureInCatalog(
              [...without, entry!].sort((a, b) => a.name.localeCompare(b.name))
            );
          });
        } else if (currentMember) {
          const created = await createMasterContent(
            "destinations",
            {
              name: location.trim(),
              gallery_urls: urls.filter(Boolean).slice(0, MAX_LOCATION_IMAGES),
              image_url: urls.find(Boolean) ?? null,
              show_on_website: false,
            },
            currentMember
          );
          entry = {
            id: created.id,
            name: created.name,
            photos: collectDisplayImages(
              created.image_url,
              created.gallery_urls,
              MAX_LOCATION_IMAGES
            ),
          };
          setLocationCatalog((prev) => {
            const without = prev.filter((e) => e.name.toLowerCase() !== q);
            return ensureDepartureInCatalog(
              [...without, entry!].sort((a, b) => a.name.localeCompare(b.name))
            );
          });
          show(`Added photos to Location master “${created.name}”`);
          return;
        } else {
          return;
        }
      } catch {
        return;
      }
    }

    if (!entry?.id) return;

    const existing = entry.photos.slice(0, MAX_LOCATION_IMAGES);
    const incoming = urls.filter(Boolean).filter((url) => !existing.includes(url));
    if (!incoming.length) return;

    // Append new photos; if over capacity, drop oldest so new uploads are kept.
    const merged = [...existing, ...incoming].slice(-MAX_LOCATION_IMAGES);

    try {
      const updated = await updateMasterContent("destinations", entry.id, {
        gallery_urls: merged,
        image_url: merged[0] ?? null,
      });
      if (updated) {
        setLocationCatalog((prev) =>
          prev.map((e) =>
            e.id === updated.id
              ? {
                  id: updated.id,
                  name: updated.name,
                  photos: collectDisplayImages(
                    updated.image_url,
                    updated.gallery_urls,
                    MAX_LOCATION_IMAGES
                  ),
                }
              : e
          )
        );
        show(`Saved to Location master “${updated.name}”`);
      }
    } catch {
      // non-blocking — day images still stay on the itinerary
    }
  }

  async function addImageFromFile(dayIndex: number, file: File) {
    setUploadingDayImage(dayIndex);
    try {
      const url = await uploadMasterImage(file, "destinations");
      let nextImages: string[] = [];
      let location: string | null = null;
      let previousCount = 0;
      updateDay(dayIndex, (d) => {
        previousCount = d.images.length;
        nextImages = [...d.images, url].slice(0, MAX_DAY_IMAGES);
        location = d.location;
        return { ...d, images: nextImages };
      });
      if (nextImages.length === previousCount) {
        show(`Day already has ${MAX_DAY_IMAGES} images — remove one to add another`);
        return;
      }
      // Always push new uploads back to Location master when a location is set.
      void syncImagesToLocation(location, [url]);
    } catch (err) {
      show(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploadingDayImage(null);
    }
  }

  function removeImage(dayIndex: number, imageIndex: number) {
    updateDay(dayIndex, (d) => ({
      ...d,
      images: d.images.filter((_, i) => i !== imageIndex),
    }));
  }

  function dayLocationRows(day: (typeof s.days)[number]): string[] {
    const extras = (day.locations ?? []).filter((l) => l.trim());
    return [day.location ?? "", ...extras];
  }

  function setDayLocations(dayIndex: number, rows: string[]) {
    const cleaned = rows.map((r) => r.trim());
    const primary = cleaned[0] || "";
    const extras = cleaned.slice(1).filter(Boolean);
    const nextLocation = primary || null;
    const photos = photosForLocation(locationCatalog, nextLocation).filter(
      (url) => !url.startsWith("data:")
    );
    updateDay(dayIndex, (d) => {
      const locationChanged =
        (d.location ?? "").trim().toLowerCase() !== (nextLocation ?? "").trim().toLowerCase();
      return {
        ...d,
        location: nextLocation,
        locations: extras,
        pickup_location: nextLocation || d.pickup_location,
        ...(locationChanged
          ? {
              images: photos,
              breakfast_hotels: [null, null] as [string | null, string | null],
              lunch_hotels: [null, null] as [string | null, string | null],
              dinner_hotels: [null, null] as [string | null, string | null],
              hotel_name: null,
              category_hotel_picks: {},
            }
          : {}),
      };
    });
  }

  const titleList = [s.header.title, ...s.header.alternate_titles];
  const clientLabel = [s.client.title, s.client.client_name].filter(Boolean).join(" ").trim();

  return (
    <div className="space-y-6">
      {showStepHeader && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-blue-600 px-4 py-3 text-white sm:px-6">
            <p className="font-medium">Itinerary Builder · Step 3 of 3</p>
            {onBack && (
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="border-white/40 bg-white/10 text-white hover:bg-white/20"
              >
                Back
              </Button>
            )}
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-stone-700">
            <p className="font-semibold text-stone-900">
              Customer: {clientLabel || "—"}
            </p>
            <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-stone-600">
              <span>Phone: {s.client.phone?.trim() || "—"}</span>
              {s.client.email?.trim() ? <span>Email: {s.client.email}</span> : null}
              {s.client.email2?.trim() ? <span>Email 2: {s.client.email2}</span> : null}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-stone-900">Itinerary Details</h2>
            </div>
            <div className="space-y-3">
              {titleList.map((title, index) => (
                <div key={index} className="flex gap-2">
                  {index === 0 && packageCatalog.length > 0 ? (
                    <PackageTitleSuggest
                      value={title}
                      onChange={(v) => {
                        const next = [...titleList];
                        next[index] = v;
                        setTitles(next);
                      }}
                      packages={packageCatalog}
                      currentPackageId={s.source_package_id}
                      onSelectPackage={onSelectPackage}
                    />
                  ) : (
                    <Input
                      value={title}
                      onChange={(e) => {
                        const next = [...titleList];
                        next[index] = e.target.value;
                        setTitles(next);
                      }}
                      placeholder={index === 0 ? "Itinerary title" : `Alternate title ${index + 1}`}
                    />
                  )}
                  <button
                    type="button"
                    className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                    onClick={() =>
                      setTitles(
                        titleList.length <= 1 ? [""] : titleList.filter((_, i) => i !== index)
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-blue-200 text-blue-700"
                onClick={() => setTitles([...titleList, ""])}
              >
                <Plus className="h-4 w-4" />
                Add Title
              </Button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Travel Date *</Label>
                <Input
                  type="date"
                  className="mt-1.5"
                  min={todayIsoDate()}
                  value={s.client.travel_date ?? ""}
                  onChange={(e) =>
                    patch({ client: { ...s.client, travel_date: e.target.value || null } })
                  }
                />
              </div>
              <div>
                <Label>Tour Code <span className="font-normal text-stone-400">(optional, internal)</span></Label>
                <Input
                  className="mt-1.5"
                  placeholder="e.g. WRT049"
                  value={s.header.tour_code ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value.trim().toUpperCase();
                    patchHeader({ tour_code: raw || null });
                  }}
                />
                <p className="mt-1 text-xs text-stone-500">
                  {lastTourCodeTip
                    ? `Internal only — leave blank to auto-assign after ${lastTourCodeTip} on save.`
                    : "Internal only — leave blank to auto-assign WRT001 on save."}
                </p>
              </div>
              <div className="sm:col-span-2">
                <Label>Duration</Label>
                <Input
                  className="mt-1.5"
                  inputMode="numeric"
                  placeholder="e.g. 03 → 02 Nights / 03 Days"
                  value={
                    durationFocused
                      ? durationDraft
                      : s.header.duration_label ?? durationLabelFromDays(s.days)
                  }
                  onFocus={(e) => {
                    onDurationFocus();
                    requestAnimationFrame(() => e.currentTarget.select());
                  }}
                  onBlur={onDurationBlur}
                  onChange={(e) => onDurationInputChange(e.target.value)}
                />
                {durationFocused &&
                  (() => {
                    const preview = parseDayCountFromDurationInput(durationDraft);
                    if (preview == null || preview < MIN_ITINERARY_DAYS) return null;
                    return (
                      <p className="mt-1.5 text-xs text-stone-500">
                        →{" "}
                        <span className="font-medium text-emerald-700">
                          {durationLabelFromDayCount(preview)}
                        </span>
                      </p>
                    );
                  })()}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-stone-900">Build Your Itinerary</h2>
              <Button type="button" size="sm" onClick={addDay} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                Add Day
              </Button>
            </div>

            {lastDayMissingDeparture && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                The last day must have Location set to <strong>Departure</strong> before saving.
              </p>
            )}

            <DndContext
              sensors={daySensors}
              collisionDetection={closestCenter}
              onDragEnd={onDayDragEnd}
            >
              <SortableContext items={dayIds} strategy={verticalListSortingStrategy}>
                {s.days.map((day, dayIndex) => {
                  const isLastDay = dayIndex === s.days.length - 1;
                  return (
                    <SortableDayCard key={day.day_uuid} id={day.day_uuid}>
                      {(dragHandle) => (
              <div
                className={cn(
                  "rounded-2xl border bg-white p-4 sm:p-5",
                  isLastDay && lastDayMissingDeparture
                    ? "border-amber-300"
                    : "border-stone-200"
                )}
              >
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {dragHandle}
                    <h3 className="text-lg font-semibold text-blue-700">Day {day.day_number}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDay(dayIndex)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Day
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Titles
                    </p>
                    <DayTitleSuggest
                      value={day.day_title}
                      onChange={(v) => updateDay(dayIndex, (d) => ({ ...d, day_title: v }))}
                      onReplace={(sug) => {
                        updateDay(dayIndex, (d) => ({
                          ...d,
                          day_title: sug.title,
                          day_description: sug.description,
                        }));
                        void learnAiSuggestionFromDay(sug.title, sug.description);
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-2 border-blue-200 text-blue-700"
                      onClick={() =>
                        updateDay(dayIndex, (d) => ({
                          ...d,
                          alternate_day_titles: [...d.alternate_day_titles, ""],
                        }))
                      }
                    >
                      <Plus className="h-4 w-4" />
                      Add Title
                    </Button>
                  </div>

                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Descriptions
                    </p>
                    <RichTextToolbar
                      value={day.day_description}
                      onChange={(html) =>
                        updateDay(dayIndex, (d) => ({ ...d, day_description: html }))
                      }
                    />
                    <Textarea
                      value={day.day_description}
                      onChange={(e) =>
                        updateDay(dayIndex, (d) => ({
                          ...d,
                          day_description: e.target.value,
                        }))
                      }
                      onBlur={() => {
                        if (day.day_title.trim()) {
                          void learnAiSuggestionFromDay(day.day_title, day.day_description);
                        }
                      }}
                      rows={5}
                      className="rounded-t-none"
                      placeholder="Day description..."
                    />
                  </div>

                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Locations
                      {isLastDay ? (
                        <span className="ml-1 font-normal normal-case text-amber-700">
                          (required: Departure)
                        </span>
                      ) : null}
                    </p>
                    <div className="space-y-2">
                      {dayLocationRows(day).map((loc, locIndex) => (
                        <div key={locIndex} className="flex gap-2">
                          <Select
                            value={
                              loc
                                ? locs.find(
                                    (l) => l.toLowerCase() === loc.trim().toLowerCase()
                                  ) ?? loc
                                : ""
                            }
                            onChange={(e) => {
                              const next = [...dayLocationRows(day)];
                              next[locIndex] = e.target.value;
                              setDayLocations(dayIndex, next);
                            }}
                            className={cn(
                              isLastDay &&
                                locIndex === 0 &&
                                lastDayMissingDeparture &&
                                "border-amber-400"
                            )}
                          >
                            <option value="">Select location</option>
                            {loc &&
                              !locs.some(
                                (l) => l.toLowerCase() === loc.trim().toLowerCase()
                              ) && <option value={loc}>{loc}</option>}
                            {locs.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </Select>
                          {dayLocationRows(day).length > 1 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setDayLocations(
                                  dayIndex,
                                  dayLocationRows(day).filter((_, i) => i !== locIndex)
                                )
                              }
                              aria-label="Remove location"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        size="sm"
                        className="bg-blue-600 text-white hover:bg-blue-700"
                        onClick={() =>
                          setDayLocations(dayIndex, [...dayLocationRows(day), ""])
                        }
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Location
                      </Button>
                    </div>
                    {isLastDay && lastDayMissingDeparture ? (
                      <p className="mt-1.5 text-xs text-amber-700">
                        Set the primary location to Departure for the final day.
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Day Images
                      <span className="ml-1 font-normal normal-case text-stone-400">
                        (up to {MAX_DAY_IMAGES} — saved to Locations)
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {day.images.slice(0, MAX_DAY_IMAGES).map((src, ii) => (
                        <div
                          key={`${src}-${ii}`}
                          className="group relative h-16 w-20 overflow-hidden rounded-lg border"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt="" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(dayIndex, ii)}
                            className="absolute right-0.5 top-0.5 rounded bg-black/60 p-0.5 text-white opacity-0 transition group-hover:opacity-100"
                            aria-label="Remove image"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {day.images.length < MAX_DAY_IMAGES && (
                        <label
                          className={cn(
                            "flex h-16 w-20 flex-col items-center justify-center rounded-lg border border-dashed border-stone-300 text-stone-500",
                            uploadingDayImage === dayIndex
                              ? "cursor-wait opacity-60"
                              : "cursor-pointer hover:border-blue-400 hover:text-blue-600"
                          )}
                        >
                          {uploadingDayImage === dayIndex ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <>
                              <Plus className="h-5 w-5" />
                              <span className="text-[10px]">Add Image</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/webp,image/jpeg,image/jpg,image/png,.webp,.jpg,.jpeg,.png"
                            className="sr-only"
                            disabled={uploadingDayImage === dayIndex}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void addImageFromFile(dayIndex, file);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      )}
                    </div>
                    {day.location ? (
                      <p className="mt-1.5 text-xs text-stone-400">
                        {day.images.length < MAX_DAY_IMAGES
                          ? "New images are also saved under Master Data → Locations."
                          : `Maximum ${MAX_DAY_IMAGES} images — remove one to add another (also updates Location master).`}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-xs text-stone-400">
                        Select a location first so uploaded images can be saved to Location master.
                      </p>
                    )}
                  </div>
                </div>
              </div>
                      )}
                    </SortableDayCard>
                  );
                })}
              </SortableContext>
            </DndContext>
          </section>
        </div>

        <div className="space-y-4">
          {/* Package Pricing — V1 layout */}
          <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
            <div className="mb-2 flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-blue-900">Package Pricing</h2>
            </div>
            <p className="text-sm text-stone-600">Select Categories (Max 2)</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {HOTEL_CATEGORY_OPTIONS.map((opt) => {
                const selected = selectedKeys.includes(opt.key);
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => toggleCategory(opt.key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium",
                      selected
                        ? "border-blue-600 bg-blue-50 text-blue-800"
                        : "border-stone-200 bg-white text-stone-600"
                    )}
                  >
                    {selected && <Check className="h-3.5 w-3.5 text-blue-600" />}
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {s.category_pricing.map((tier) => (
              <div key={tier.category_key} className="mt-5 space-y-3 border-t border-stone-100 pt-4">
                <span className="inline-block rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                  For {tier.label}
                </span>
                <div>
                  <Label>Package Price</Label>
                  <Input
                    type="number"
                    min={0}
                    className="mt-1.5"
                    value={tier.package_price || ""}
                    onChange={(e) =>
                      updateTier(
                        tier.category_key,
                        "package_price",
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                  />
                  <p className="mt-1 text-xs text-stone-500">
                    Enter separately for each category · Starts at 0
                  </p>
                </div>
                <div>
                  <Label>Discount Price (Optional)</Label>
                  <Input
                    type="number"
                    min={0}
                    className="mt-1.5"
                    value={tier.discount_price || ""}
                    onChange={(e) =>
                      updateTier(
                        tier.category_key,
                        "discount_price",
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                  />
                  <p className="mt-1 text-xs text-stone-500">
                    Subtracted from package price · Final {formatInr(tier.grand_total)}
                  </p>
                </div>
              </div>
            ))}
          </section>

          {s.category_pricing.length > 0 && (
            <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
              <h3 className="text-lg font-semibold text-blue-900">Booking Amount</h3>
              <div className="mt-3 space-y-4">
                {s.category_pricing.map((tier) => (
                  <div key={`book-${tier.category_key}`}>
                    <span className="inline-block rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                      For {tier.label}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      className="mt-2"
                      value={tier.booking_amount || ""}
                      onChange={(e) =>
                        updateTier(
                          tier.category_key,
                          "booking_amount",
                          e.target.value === "" ? null : Number(e.target.value)
                        )
                      }
                    />
                    <p className="mt-1 text-xs text-stone-500">
                      Auto: 20% of final price (editable)
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <Car className="h-5 w-5 text-violet-600" />
              <h3 className="text-lg font-semibold text-stone-900">Vehicle Selection</h3>
            </div>
            <div className="flex gap-2">
              <Select
                className="flex-1"
                value={vehicles.includes(selectedVehicle) ? selectedVehicle : ""}
                onChange={(e) => setVehicle(e.target.value)}
              >
                <option value="">
                  {vehicleCatalog.length ? "Select Vehicle" : "No vehicles in master data"}
                </option>
                {vehicleCatalog
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((v) => {
                    const meta = [v.vehicle_type, v.capacity ? `${v.capacity} seater` : null]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <option key={v.id} value={v.name}>
                        {meta ? `${v.name} (${meta})` : v.name}
                      </option>
                    );
                  })}
              </Select>
            </div>
            {selectedVehicle && vehicles.includes(selectedVehicle) ? (
              <div className="mt-3">
                <SelectedVehicleChip
                  name={selectedVehicle}
                  vehicle={findVehicleByName(vehicleCatalog, selectedVehicle)}
                  onRemove={() => setVehicle("")}
                />
              </div>
            ) : null}
            <div className="mt-4 space-y-4">
              <div>
                <Label>Final Price</Label>
                <p className="mt-0.5 text-xs text-stone-500">
                  Package price − discount (updates automatically)
                </p>
              </div>
              {s.category_pricing.map((tier) => (
                <div key={`final-${tier.category_key}`}>
                  <span className="inline-block rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                    For {tier.label}
                  </span>
                  <Input
                    type="number"
                    className="mt-2 bg-stone-50"
                    value={tier.grand_total || ""}
                    readOnly
                    tabIndex={-1}
                  />
                </div>
              ))}
              {!s.category_pricing.length && (
                <Input type="number" className="mt-1.5" value="" readOnly tabIndex={-1} />
              )}
              <div className="flex flex-wrap gap-4 text-sm">
                {priceBasisOptions.map(([value, label]) => (
                  <label key={value} className="inline-flex items-center gap-2 text-stone-700">
                    <input
                      type="radio"
                      name="price_basis"
                      checked={s.price_basis === value}
                      onChange={() => patch({ price_basis: value })}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </section>

          {s.category_pricing.length === 0 ? (
            <section className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
              Select at least one hotel category above to configure night hotels.
            </section>
          ) : (
            s.category_pricing.map((tier) => {
              const primaryKey = s.category_pricing[0]?.category_key ?? null;
              return (
                <section
                  key={`hotels-${tier.category_key}`}
                  className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5"
                >
                  <div className="flex items-center gap-2">
                    <Moon className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-stone-900">
                      Hotels for {tier.label} Category
                    </h3>
                  </div>
                  <div>
                    <Label>Hotel Category</Label>
                    <Select className="mt-1.5" value={tier.category_key} disabled>
                      <option value={tier.category_key}>{tier.label}</option>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    {hotelBlockDays.map((day, nightIndex) => {
                      const dayIndex = s.days.findIndex((d) => d.day_uuid === day.day_uuid);
                      const nightNo = String(nightIndex + 1).padStart(2, "0");
                      const viewDay = dayViewForCategory(
                        day,
                        tier.category_key,
                        tier.room_category,
                        primaryKey
                      );
                      return (
                        <NightHotelCard
                          key={`${tier.category_key}-${day.day_uuid}`}
                          day={viewDay}
                          nightNo={nightNo}
                          hotelCatalog={hotelCatalog}
                          onChange={(updater) =>
                            updateDay(dayIndex, (d) =>
                              applyCategoryDayUpdate(
                                d,
                                tier.category_key,
                                tier.room_category,
                                primaryKey,
                                updater
                              )
                            )
                          }
                        />
                      );
                    })}
                  </div>
                </section>
              );
            })
          )}
          {isDepartureLocation(s.days[s.days.length - 1]?.location) ? (
              <p className="text-xs text-stone-500">
                Last day is Departure — Night {String(s.days.length).padStart(2, "0")} is omitted.
                Hotel data is kept if you change the location back.
              </p>
            ) : (
              <p className="text-xs text-amber-700">
                Set the last day&apos;s location to Departure to omit the final night hotel block.
              </p>
            )}
        </div>
      </div>

      {hasItineraryEdits ? (
        <div className="flex justify-start pb-2">
          <Button type="button" onClick={handleSaveClick} className="bg-emerald-600 hover:bg-emerald-700">
            <Save className="h-4 w-4" />
            {saveLabel}
          </Button>
        </div>
      ) : null}

      <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Check className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-stone-900">Optional Inclusions</h2>
        </div>
        <div className="space-y-3">
          {OPTIONAL_INCLUSIONS.map((opt) => (
            <label
              key={opt.key}
              className="flex cursor-pointer gap-3 rounded-xl border border-stone-100 p-3 hover:bg-stone-50"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={s.optional_inclusion_keys.includes(opt.key)}
                onChange={() => toggleOptional(opt.key)}
              />
              <span>
                <span className="font-medium text-stone-900">{opt.label}</span>
                <span className="mt-0.5 block text-sm text-stone-600">{opt.description}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <div className="space-y-3 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setNoteOpen(true);
              requestAnimationFrame(() => noteRef.current?.focus());
            }}
            className="border-blue-200 text-blue-700"
          >
            <StickyNote className="h-4 w-4" />
            {itineraryNote ? "Edit Note" : "Add Note"}
          </Button>
          <Button type="button" onClick={handlePreviewClick} className="bg-slate-800 hover:bg-slate-900">
            <Eye className="h-4 w-4" />
            Preview & Confirm
          </Button>
        </div>
        {noteOpen ? (
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
            <Label htmlFor="itinerary_internal_notes" className="text-blue-900">
              Note
            </Label>
            <p className="mt-0.5 text-xs text-stone-500">
              Staff only — not shown on Preview &amp; Confirm or the client itinerary.
            </p>
            <Textarea
              ref={noteRef}
              id="itinerary_internal_notes"
              rows={3}
              className="mt-2"
              placeholder="Add an internal note for staff…"
              value={s.internal_notes || ""}
              onChange={(e) =>
                onChange({
                  ...s,
                  internal_notes: e.target.value,
                  public_notes: "",
                })
              }
            />
          </div>
        ) : null}
      </div>

      {s.category_pricing[0] && (
        <p className="text-center text-xs text-stone-500">
          Primary grand total: {formatInr(s.final_price ?? s.category_pricing[0].grand_total)}
        </p>
      )}
    </div>
  );
}
