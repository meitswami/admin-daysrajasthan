"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { RichTextToolbar } from "@/components/ui/rich-text-toolbar";
import {
  emptyDay,
  OPTIONAL_INCLUSIONS,
  VEHICLE_TYPES,
} from "@/lib/itinerary-builder/defaults";
import { durationLabelFromDays, formatInr } from "@/lib/itinerary-builder/cost-engine";
import { buildCategoryPricing } from "@/lib/itinerary-builder/package-catalog";
import { normalizeSnapshot } from "@/lib/itinerary-builder/normalize";
import {
  learnAiSuggestionFromDay,
  searchAiSuggestions,
  type AiSuggestion,
} from "@/lib/itinerary-builder/ai-suggestions";
import {
  findHotelByOptionLabel,
  formatHotelOption,
  hotelLocations,
  hotelsForLocation,
  type HotelMasterItem,
} from "@/lib/itinerary-builder/hotel-master";
import { cities, destinations, vehicles as masterVehicles } from "@/lib/data/website-content";
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
  IndianRupee,
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
} from "lucide-react";

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=200&q=80",
  "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=200&q=80",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=200&q=80",
];

function locationOptions(): string[] {
  const names = new Set<string>(hotelLocations());
  destinations.forEach((d) => names.add(d.name));
  cities.forEach((c) => names.add(c.name.replace(/ City$/, "")));
  ["Jaipur", "Jodhpur", "Udaipur", "Jaisalmer", "Pushkar", "Departure", "Delhi", "Agra"].forEach(
    (n) => names.add(n)
  );
  return Array.from(names).sort();
}

function vehicleOptions(): string[] {
  const names = new Set<string>([
    ...VEHICLE_TYPES,
    "Tempo Traveller 17 Seater",
    "Tempo Traveller 12 Seater",
  ]);
  masterVehicles.forEach((v) => names.add(v.name));
  return Array.from(names);
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
    const found = searchAiSuggestions(value);
    setMatches(found);
    setOpen(found.length > 0);
  }, [value]);

  return (
    <div className="relative space-y-2">
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (value.trim().length >= 2) {
              const found = searchAiSuggestions(value);
              setMatches(found);
              setOpen(found.length > 0);
            }
          }}
          onBlur={() => {
            // learn custom titles into master data
            if (value.trim().length >= 3) {
              learnAiSuggestionFromDay(value, "");
            }
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

function NightHotelCard({
  day,
  dayIndex,
  nightNo,
  onChange,
}: {
  day: ItineraryDay;
  dayIndex: number;
  nightNo: string;
  onChange: (updater: (d: ItineraryDay) => ItineraryDay) => void;
}) {
  const locationHotels = useMemo(
    () => hotelsForLocation(day.location),
    [day.location]
  );

  const breakfastSelected = [day.breakfast_hotels[0], day.breakfast_hotels[1]].filter(
    Boolean
  ) as string[];

  /** Lunch/dinner only show breakfast picks once both (or any) breakfast hotels chosen */
  const mealCascadeOptions =
    breakfastSelected.length > 0
      ? locationHotels.filter((h) => breakfastSelected.includes(formatHotelOption(h)))
      : locationHotels;

  function hotelSelectOptions(
    list: HotelMasterItem[],
    excludeLabel: string | null
  ): HotelMasterItem[] {
    return list.filter((h) => formatHotelOption(h) !== excludeLabel);
  }

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

  const stayOptions = hotelSelectOptions(
    locationHotels,
    null
  );

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
        <span className="rounded-full bg-blue-600 px-3 py-1 text-sm font-semibold text-white">
          Night - {nightNo} · Day {day.day_number}
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
      ) : !day.location ? (
        <div className="mb-3 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-center text-sm text-stone-500">
          Select a location on Day {day.day_number} to load hotels for this block.
        </div>
      ) : locationHotels.length === 0 ? (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-900">
          No hotels found for &quot;{day.location}&quot;. Try another location or add hotels in Master Data.
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
              const opts = hotelSelectOptions(stayOptions, other);
              return (
                <Select
                  key={slot}
                  value={day.breakfast_hotels[slot as 0 | 1] ?? ""}
                  onChange={(e) => setStayHotel(slot as 0 | 1, e.target.value)}
                  disabled={!day.location}
                >
                  <option value="">Hotel {slot + 1}</option>
                  {opts.map((h) => (
                    <option key={h.id} value={formatHotelOption(h)}>
                      {formatHotelOption(h)}
                    </option>
                  ))}
                </Select>
              );
            })}
          </div>
          {(day.breakfast_hotels[0] || day.breakfast_hotels[1]) && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {day.breakfast_hotels.filter(Boolean).map((label) => {
                const hotel = findHotelByOptionLabel(label!);
                return (
                  <div
                    key={label}
                    className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={hotel?.image_url ?? PLACEHOLDER_IMAGES[0]}
                      alt=""
                      className="h-10 w-10 rounded object-cover"
                    />
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-stone-800">
                      {hotel?.name ?? label}
                    </span>
                    <button
                      type="button"
                      className="text-red-500"
                      onClick={() => {
                        onChange((d) => ({
                          ...d,
                          breakfast_hotels: [
                            d.breakfast_hotels[0] === label ? null : d.breakfast_hotels[0],
                            d.breakfast_hotels[1] === label ? null : d.breakfast_hotels[1],
                          ],
                        }));
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
          <div className="mb-3 flex items-center gap-1 text-sm font-medium text-stone-700">
            <MapPin className="h-3.5 w-3.5 text-blue-600" />
            {day.location || "Select location on the day card first"}
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
                  const filtered = hotelSelectOptions(opts, other);
                  return (
                    <Select
                      key={slot}
                      value={day[field][slot as 0 | 1] ?? ""}
                      onChange={(e) => setMeal(field, slot as 0 | 1, e.target.value)}
                      disabled={!day.location}
                    >
                      <option value="">
                        {label} {slot + 1}
                      </option>
                      {filtered.map((h) => (
                        <option key={h.id} value={formatHotelOption(h)}>
                          {formatHotelOption(h)}
                        </option>
                      ))}
                    </Select>
                  );
                })}
              </div>
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

export function V1BuilderForm({
  snapshot,
  onChange,
  showStepHeader,
  onBack,
  onSave,
  onPreview,
  onAddNote,
  saveLabel = "Save New Itinerary",
}: {
  snapshot: ItinerarySnapshot;
  onChange: (next: ItinerarySnapshot) => void;
  showStepHeader?: boolean;
  onBack?: () => void;
  onSave: () => void;
  onPreview: () => void;
  onAddNote?: () => void;
  saveLabel?: string;
}) {
  const s = normalizeSnapshot(snapshot);
  const locs = useMemo(() => locationOptions(), []);
  const vehicles = useMemo(() => vehicleOptions(), []);
  const selectedKeys = s.category_pricing.map((c) => c.category_key) as HotelCategoryKey[];
  /** One hotels block on the right for every day on the left */
  const hotelBlockDays = s.days;
  const vehicleList = s.vehicle_types?.length
    ? s.vehicle_types
    : s.vehicle_type
      ? [s.vehicle_type]
      : [];

  function patch(partial: Partial<ItinerarySnapshot>) {
    onChange(normalizeSnapshot({ ...s, ...partial }));
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
    patch({
      days,
      header: { ...s.header, duration_label: durationLabelFromDays(days) },
    });
  }

  function addDay() {
    const days = [...s.days, emptyDay(s.days.length + 1)];
    patch({
      days,
      header: { ...s.header, duration_label: durationLabelFromDays(days) },
    });
  }

  function removeDay(index: number) {
    if (s.days.length <= 1) return;
    const days = s.days
      .filter((_, i) => i !== index)
      .map((d, i) => ({ ...d, day_number: i + 1 }));
    patch({
      days,
      header: { ...s.header, duration_label: durationLabelFromDays(days) },
    });
  }

  function toggleCategory(key: HotelCategoryKey) {
    let keys = [...selectedKeys];
    if (keys.includes(key)) keys = keys.filter((k) => k !== key);
    else if (keys.length >= 2) return;
    else keys = [...keys, key];

    const discounts: Partial<Record<HotelCategoryKey, number | null>> = {};
    const overrides: Partial<Record<HotelCategoryKey, number | null>> = {};
    const booking: Partial<Record<HotelCategoryKey, number | null>> = {};
    for (const tier of s.category_pricing) {
      discounts[tier.category_key] = tier.discount_price;
      if (tier.manual_override != null) overrides[tier.category_key] = tier.manual_override;
      booking[tier.category_key] = tier.booking_amount;
    }
    const category_pricing = buildCategoryPricing(s, keys, discounts, overrides).map((t) => ({
      ...t,
      booking_amount: booking[t.category_key] ?? t.booking_amount ?? null,
    }));
    patch({ category_pricing });
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
    const discounts: Partial<Record<HotelCategoryKey, number | null>> = {};
    const overrides: Partial<Record<HotelCategoryKey, number | null>> = {};
    const booking: Partial<Record<HotelCategoryKey, number | null>> = {};
    for (const tier of s.category_pricing) {
      discounts[tier.category_key] =
        field === "discount_price" && tier.category_key === categoryKey
          ? value
          : tier.discount_price;
      overrides[tier.category_key] =
        field === "package_price" && tier.category_key === categoryKey
          ? value
          : tier.manual_override;
      booking[tier.category_key] = tier.booking_amount;
    }
    if (field === "package_price") overrides[categoryKey] = value;
    if (field === "discount_price") discounts[categoryKey] = value;
    patch({
      category_pricing: buildCategoryPricing(s, selectedKeys, discounts, overrides).map((t) => ({
        ...t,
        booking_amount: booking[t.category_key] ?? null,
      })),
    });
  }

  function addVehicle(v: string) {
    if (!v || vehicleList.includes(v)) return;
    const vehicle_types = [...vehicleList, v];
    patch({ vehicle_types, vehicle_type: vehicle_types[0] ?? null });
  }

  function removeVehicle(v: string) {
    const vehicle_types = vehicleList.filter((x) => x !== v);
    patch({ vehicle_types, vehicle_type: vehicle_types[0] ?? null });
  }

  function toggleOptional(key: string) {
    const has = s.optional_inclusion_keys.includes(key);
    const optional_inclusion_keys = has
      ? s.optional_inclusion_keys.filter((k) => k !== key)
      : [...s.optional_inclusion_keys, key];
    patch({
      optional_inclusion_keys,
      inclusions: mergeOptionalInclusions(s.inclusions, optional_inclusion_keys),
    });
  }

  function addImage(dayIndex: number) {
    updateDay(dayIndex, (d) => ({
      ...d,
      images: [...d.images, PLACEHOLDER_IMAGES[d.images.length % PLACEHOLDER_IMAGES.length]],
    }));
  }

  const titleList = [s.header.title, ...s.header.alternate_titles];

  return (
    <div className="space-y-6">
      {showStepHeader && (
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
                  <Input
                    value={title}
                    onChange={(e) => {
                      const next = [...titleList];
                      next[index] = e.target.value;
                      setTitles(next);
                    }}
                    placeholder={index === 0 ? "Itinerary title" : `Alternate title ${index + 1}`}
                  />
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
                  value={s.client.travel_date ?? ""}
                  onChange={(e) =>
                    patch({ client: { ...s.client, travel_date: e.target.value || null } })
                  }
                />
              </div>
              <div>
                <Label>Tour Code</Label>
                <Input
                  className="mt-1.5"
                  value={s.header.tour_code ?? ""}
                  onChange={(e) => patchHeader({ tour_code: e.target.value || null })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Duration</Label>
                <Input
                  className="mt-1.5 bg-stone-50"
                  readOnly
                  value={s.header.duration_label ?? durationLabelFromDays(s.days)}
                />
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

            {s.days.map((day, dayIndex) => (
              <div
                key={day.day_uuid}
                className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5"
              >
                <div className="mb-4 flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold text-blue-700">Day {day.day_number}</h3>
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
                        learnAiSuggestionFromDay(sug.title, sug.description);
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
                          learnAiSuggestionFromDay(day.day_title, day.day_description);
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
                    </p>
                    <Select
                      value={day.location ?? ""}
                      onChange={(e) =>
                        updateDay(dayIndex, (d) => ({
                          ...d,
                          location: e.target.value || null,
                          pickup_location: e.target.value || d.pickup_location,
                          // clear hotels when location changes
                          breakfast_hotels: [null, null],
                          lunch_hotels: [null, null],
                          dinner_hotels: [null, null],
                          hotel_name: null,
                        }))
                      }
                    >
                      <option value="">Select location</option>
                      {locs.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Day Images
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {day.images.map((src, ii) => (
                        <div
                          key={`${src}-${ii}`}
                          className="relative h-16 w-20 overflow-hidden rounded-lg border"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt="" className="h-full w-full object-cover" />
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addImage(dayIndex)}
                        className="flex h-16 w-20 flex-col items-center justify-center rounded-lg border border-dashed border-stone-300 text-stone-500 hover:border-blue-400 hover:text-blue-600"
                      >
                        <Plus className="h-5 w-5" />
                        <span className="text-[10px]">Add Image</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
                  <Label>Package Price (Auto-filled from Itinerary)</Label>
                  <Input
                    type="number"
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
                  <p className="mt-1 text-xs text-stone-500">Auto-filled from selected itinerary</p>
                </div>
                <div>
                  <Label>Discount Price (Optional)</Label>
                  <Input
                    type="number"
                    className="mt-1.5"
                    value={tier.discount_price ?? 0}
                    onChange={(e) =>
                      updateTier(
                        tier.category_key,
                        "discount_price",
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </section>

          {s.category_pricing.map((tier) => (
            <section
              key={`book-${tier.category_key}`}
              className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5"
            >
              <h3 className="text-lg font-semibold text-blue-900">Booking Amount</h3>
              <span className="mt-2 inline-block rounded-full bg-blue-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                For {tier.label}
              </span>
              <Input
                type="number"
                className="mt-3"
                value={tier.booking_amount ?? ""}
                onChange={(e) =>
                  updateTier(
                    tier.category_key,
                    "booking_amount",
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
                placeholder="0"
              />
            </section>
          ))}

          <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <Car className="h-5 w-5 text-violet-600" />
              <h3 className="text-lg font-semibold text-stone-900">Vehicle Selection</h3>
            </div>
            <div className="flex gap-2">
              <Select
                className="flex-1"
                value=""
                onChange={(e) => {
                  if (e.target.value) addVehicle(e.target.value);
                  e.target.value = "";
                }}
              >
                <option value="">Select Vehicle</option>
                {vehicles
                  .filter((v) => !vehicleList.includes(v))
                  .map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
              </Select>
            </div>
            <div className="mt-3 space-y-2">
              {vehicleList.map((v) => (
                <div
                  key={v}
                  className="flex items-center justify-between rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-900"
                >
                  <span>{v}</span>
                  <button
                    type="button"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => removeVehicle(v)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Label>Final Price</Label>
              <Input
                type="number"
                className="mt-1.5"
                value={s.final_price ?? s.category_pricing[0]?.grand_total ?? 0}
                onChange={(e) =>
                  patch({
                    final_price: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                {(
                  [
                    ["per_person", "Per Person"],
                    ["whole_group", "Whole Group/Family"],
                  ] as [PriceBasis, string][]
                ).map(([value, label]) => (
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

          {hotelBlockDays.map((day) => {
            const dayIndex = s.days.findIndex((d) => d.day_uuid === day.day_uuid);
            const nightNo = String(day.day_number).padStart(2, "0");
            return (
              <NightHotelCard
                key={day.day_uuid}
                day={day}
                dayIndex={dayIndex}
                nightNo={nightNo}
                onChange={(updater) => updateDay(dayIndex, updater)}
              />
            );
          })}
        </div>
      </div>

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

      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <Button
          type="button"
          variant="outline"
          onClick={onAddNote}
          className="border-blue-200 text-blue-700"
        >
          <StickyNote className="h-4 w-4" />
          Add Note
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onSave} className="bg-emerald-600 hover:bg-emerald-700">
            <Save className="h-4 w-4" />
            {saveLabel}
          </Button>
          <Button type="button" onClick={onPreview} className="bg-slate-800 hover:bg-slate-900">
            <Eye className="h-4 w-4" />
            Preview & Confirm
          </Button>
        </div>
      </div>

      {s.category_pricing[0] && (
        <p className="text-center text-xs text-stone-500">
          Primary grand total: {formatInr(s.final_price ?? s.category_pricing[0].grand_total)}
        </p>
      )}
    </div>
  );
}
