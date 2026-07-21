"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { formatInr, advanceRateFromPercent } from "@/lib/itinerary-builder/cost-engine";
import { normalizeSnapshot } from "@/lib/itinerary-builder/normalize";
import {
  findHotelByOptionLabel,
} from "@/lib/itinerary-builder/hotel-master";
import {
  contentBlocksToStrings,
  emptyContentBlock,
  MASTER_CANCELLATION,
  MASTER_PAYMENT,
  MASTER_TERMS,
  PREVIEW_CONTACTS,
  type ContentBlockItem,
  type PolicyLine,
} from "@/lib/itinerary-builder/policy-master";
import {
  PREVIEW_THEMES,
  themeCardLabel,
  themeShellClass,
} from "@/lib/itinerary-builder/preview-themes";
import {
  getClientItinerary,
  getRevisions,
  saveSnapshotRevision,
} from "@/lib/itinerary-builder/storage";
import type { ClientItineraryRecord, ItineraryDay, ItinerarySnapshot } from "@/types/itinerary-builder";
import { formatDate, cn } from "@/lib/utils";
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Download,
  Eye,
  Info,
  Mail,
  MapPin,
  Palette,
  Phone,
  Save,
  Target,
  X,
} from "lucide-react";

function dayTravelDate(travelDate: string | null, dayNumber: number): string {
  if (!travelDate) return "";
  const d = new Date(travelDate);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + dayNumber - 1);
  return formatDate(d.toISOString().slice(0, 10));
}

function hotelLabelsForDay(day: ItineraryDay): string[] {
  const labels = [
    ...day.breakfast_hotels,
    ...day.lunch_hotels,
    ...day.dinner_hotels,
    day.hotel_name,
  ].filter(Boolean) as string[];
  return Array.from(new Set(labels));
}

function PolicyAccordion({
  title,
  icon,
  tone,
  items,
}: {
  title: string;
  icon: ReactNode;
  tone: "stone" | "orange" | "violet";
  items: PolicyLine[];
}) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
  const wrap =
    tone === "orange"
      ? "border-orange-200 bg-orange-50/70"
      : tone === "violet"
        ? "border-violet-200 bg-violet-50/70"
        : "border-slate-200 bg-slate-50/80";
  const head =
    tone === "orange"
      ? "text-orange-800"
      : tone === "violet"
        ? "text-violet-800"
        : "text-slate-800";
  const itemTone =
    tone === "orange"
      ? "text-orange-700"
      : tone === "violet"
        ? "text-violet-700"
        : "text-blue-700";

  return (
    <section className={cn("rounded-2xl border p-4 sm:p-5", wrap)}>
      <h2 className={cn("mb-3 flex items-center gap-2 text-lg font-semibold", head)}>
        {icon}
        {title}
      </h2>
      <div className="space-y-2">
        {items.map((item) => {
          const open = openId === item.id;
          return (
            <div key={item.id} className="overflow-hidden rounded-xl border border-white/80 bg-white">
              <button
                type="button"
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium",
                  itemTone
                )}
                onClick={() => setOpenId(open ? null : item.id)}
              >
                <span>{item.title}</span>
                {open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
              </button>
              {open && (
                <div className="border-t border-stone-100 px-4 py-3 text-sm text-stone-600">
                  {item.description || (
                    <span className="italic text-stone-400">Master policy item (fixed)</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EditableBlocks({
  title,
  tone,
  items,
  onChange,
}: {
  title: string;
  tone: "green" | "red";
  items: ContentBlockItem[];
  onChange: (next: ContentBlockItem[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(items);

  useEffect(() => {
    if (!editing) setDraft(items);
  }, [items, editing]);

  function updateItem(id: string, patch: Partial<ContentBlockItem>) {
    setDraft((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function removeItem(id: string) {
    setDraft((prev) => prev.filter((i) => i.id !== id));
  }

  function save() {
    onChange(draft);
    setEditing(false);
  }

  const wrap = tone === "green" ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50";
  const head = tone === "green" ? "text-emerald-800" : "text-red-800";

  return (
    <section className={cn("rounded-2xl border p-4", wrap)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className={cn("flex items-center gap-2 text-lg font-semibold", head)}>
          {tone === "green" ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
          {title}
        </h2>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button type="button" size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={save}>
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setDraft(items);
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {(editing ? draft : items).map((item) => (
          <div key={item.id} className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
            {editing ? (
              <>
                <Input
                  value={item.title}
                  onChange={(e) => updateItem(item.id, { title: e.target.value })}
                  placeholder="Title"
                  className="mb-2"
                />
                <Textarea
                  value={item.description}
                  onChange={(e) => updateItem(item.id, { description: e.target.value })}
                  placeholder={`${title.slice(0, -1)} description`}
                  rows={3}
                />
                {item.images[0] && (
                  <div className="mt-2">
                    <p className="mb-1 text-xs font-medium text-stone-500">Current Images</p>
                    <div className="relative inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.images[0]} alt="" className="h-16 w-20 rounded object-cover" />
                      <button
                        type="button"
                        className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white"
                        onClick={() => updateItem(item.id, { images: [] })}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
                <div className="mt-2">
                  <p className="mb-1 text-xs font-medium text-stone-500">Upload New Images (URL)</p>
                  <Input
                    placeholder="https://…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const v = (e.target as HTMLInputElement).value.trim();
                        if (v) {
                          updateItem(item.id, { images: [...item.images, v] });
                          (e.target as HTMLInputElement).value = "";
                        }
                      }
                    }}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="mt-3"
                  onClick={() => removeItem(item.id)}
                >
                  Remove
                </Button>
              </>
            ) : (
              <>
                <p className="font-semibold text-stone-900">{item.title}</p>
                {item.description && (
                  <p className="mt-1 text-sm text-stone-600">{item.description}</p>
                )}
                {item.images.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.images.map((src) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={src} src={src} alt="" className="h-14 w-16 rounded object-cover" />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-3"
          onClick={() => setDraft((d) => [...d, emptyContentBlock()])}
        >
          + Add {title.slice(0, -1)}
        </Button>
      )}
    </section>
  );
}

const THEMES = PREVIEW_THEMES;

export function PreviewConfirmView({ itineraryId }: { itineraryId: string }) {
  const router = useRouter();
  const { show } = useToast();
  const [record, setRecord] = useState<ClientItineraryRecord | null>(null);
  const [snapshot, setSnapshot] = useState<ItinerarySnapshot | null>(null);

  useEffect(() => {
    const r = getClientItinerary(itineraryId);
    const revs = getRevisions(itineraryId);
    const current = revs.find((rev) => rev.id === r?.current_revision_id) ?? revs[0];
    if (r && current) {
      setRecord(r);
      setSnapshot(normalizeSnapshot(current.snapshot));
    }
  }, [itineraryId]);

  const themeShell = useMemo(
    () => themeShellClass(snapshot?.preview_theme),
    [snapshot?.preview_theme]
  );

  if (!record || !snapshot) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-stone-500">
        Loading preview…
      </div>
    );
  }

  function patch(partial: Partial<ItinerarySnapshot>) {
    setSnapshot((prev) => (prev ? normalizeSnapshot({ ...prev, ...partial }) : prev));
  }

  async function handleSave() {
    if (!snapshot) return;
    const synced = normalizeSnapshot({
      ...snapshot,
      inclusions: contentBlocksToStrings(snapshot.inclusion_items),
      exclusions: contentBlocksToStrings(snapshot.exclusion_items),
    });
    const result = saveSnapshotRevision(itineraryId, synced, {
      save_type: "manual",
      milestone_label: "Preview & Confirm",
    });
    if (!result) {
      show("Failed to save");
      return;
    }
    setRecord(result.record);
    setSnapshot(normalizeSnapshot(result.revision.snapshot));

    const { syncRecordToSupabaseIfReal } = await import("@/lib/itinerary-builder/sync-real");
    const sync = await syncRecordToSupabaseIfReal(result.record, result.revision);
    if (!sync.ok) {
      show("Saved on this device, but cloud sync failed — try Save again");
      return result;
    }
    show("Saved");
    return result;
  }

  async function handleNext() {
    const result = await handleSave();
    if (!result) return;
    router.push(`/itinerary-builder/${itineraryId}/payment`);
  }

  function handleDownloadPdf() {
    void handleSave();
    window.open(`/itinerary-builder/${itineraryId}/quotation`, "_blank");
  }

  async function handlePreview() {
    const result = await handleSave();
    if (!result) return;
    router.push(`/itinerary-builder/${itineraryId}/quotation`);
  }

  const primaryTier = snapshot.category_pricing;
  const advanceRate = advanceRateFromPercent(snapshot.advance_percent);

  return (
    <div className={cn("min-h-screen", themeShell)}>
      <div className="no-print sticky top-0 z-20 border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Preview & Confirm
            </p>
            <p className="font-semibold text-stone-900">
              {record.quote_id} · {snapshot.header.title}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/itinerary-builder/${itineraryId}`}
              className="inline-flex items-center rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-100"
            >
              Back to Edit
            </Link>
            <Button type="button" size="sm" className="bg-teal-800 hover:bg-teal-900" onClick={handleSave}>
              <Save className="h-4 w-4" />
              Save
            </Button>
            <Button type="button" size="sm" className="bg-sky-500 hover:bg-sky-600" onClick={handleDownloadPdf}>
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-teal-700 hover:bg-teal-800"
              onClick={handlePreview}
            >
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-[#7B1E2E] hover:bg-[#5C0F1A]"
              onClick={handleNext}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 print:max-w-none">
        {/* Day cards */}
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            {snapshot.days.map((day) => {
              const hotels = hotelLabelsForDay(day);
              const categoryLabel =
                snapshot.category_pricing[0]?.label ??
                (day.epai_plan_only ? "Stay Only" : "Hotels");
              return (
                <article
                  key={day.day_uuid}
                  className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="flex gap-4">
                    <div className="flex w-16 shrink-0 flex-col items-center text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-lg font-bold text-white">
                        {day.day_number}
                      </div>
                      <p className="mt-1 text-xs font-semibold text-stone-700">Day {day.day_number}</p>
                      <p className="text-[10px] text-stone-500">
                        {dayTravelDate(snapshot.client.travel_date, day.day_number)}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold text-stone-900">{day.day_title}</h3>
                      {(day.location || day.pickup_location) && (
                        <p className="mt-1 inline-flex items-center gap-1 text-sm text-stone-600">
                          <MapPin className="h-3.5 w-3.5 text-blue-600" />
                          {day.location || day.pickup_location}
                        </p>
                      )}
                      {day.day_description && (
                        <p className="mt-2 text-sm text-stone-600 line-clamp-3">{day.day_description}</p>
                      )}
                      {day.guest_self_booked_hotel ? (
                        <p className="mt-3 rounded-xl bg-stone-50 px-3 py-2 text-sm text-stone-600">
                          No hotels booked — guest arranging own accommodation.
                        </p>
                      ) : hotels.length > 0 ? (
                        <div className="mt-3 rounded-xl border border-stone-100 bg-stone-50 p-3">
                          <p className="text-sm font-semibold text-stone-800">
                            {categoryLabel}
                            {day.epai_plan_only ? " - Stay Only" : ""}
                          </p>
                          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-stone-500">
                            Hotel Options
                          </p>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {hotels.slice(0, 4).map((label) => {
                              const hotel = findHotelByOptionLabel(label);
                              return (
                                <div
                                  key={label}
                                  className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white p-2"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={hotel?.image_url ?? "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=100&q=80"}
                                    alt=""
                                    className="h-12 w-12 rounded object-cover"
                                  />
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-stone-900">
                                      {hotel?.name ?? label.split(" - ")[0]}
                                    </p>
                                    <p className="text-xs text-amber-600">
                                      ★ {hotel?.rating?.toFixed(1) ?? "4.5"}{" "}
                                      <span className="text-stone-400">
                                        ({Math.round((hotel?.rating ?? 4.5) * 300)} reviews)
                                      </span>
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-4 shadow-sm lg:sticky lg:top-20">
            <h2 className="text-lg font-semibold text-stone-900">Price Summary</h2>
            <div className="mt-3 space-y-2 text-sm">
              {primaryTier.map((tier) => (
                <div key={tier.category_key} className="space-y-1 border-b border-stone-100 pb-2">
                  <div className="flex justify-between gap-2">
                    <span className="text-stone-600">{tier.label} Base Price</span>
                    <span className="font-medium">{formatInr(tier.package_price)}</span>
                  </div>
                  {tier.discount_price != null && tier.discount_price > 0 && (
                    <div className="flex justify-between gap-2">
                      <span className="text-stone-600">Discount ({tier.label})</span>
                      <span className="font-medium text-rose-700">
                        −{formatInr(tier.discount_price)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <span className="text-stone-600">
                      Booking Amount ({snapshot.advance_percent ?? 20}%)
                    </span>
                    <span className="font-medium">
                      {formatInr(
                        tier.booking_amount ?? Math.round(tier.grand_total * advanceRate)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 font-semibold text-stone-900">
                    <span>{tier.label} Final</span>
                    <span>{formatInr(tier.grand_total)}</span>
                  </div>
                </div>
              ))}
              {snapshot.final_price != null && (
                <div className="flex justify-between pt-1 text-base font-bold text-emerald-800">
                  <span>Final Price</span>
                  <span>{formatInr(snapshot.final_price)}</span>
                </div>
              )}
              {!primaryTier.length && (
                <p className="text-stone-500">No category pricing set.</p>
              )}
            </div>
          </aside>
        </div>

        {/* Inclusions / Exclusions */}
        <div className="grid gap-4 lg:grid-cols-2">
          <EditableBlocks
            title="Inclusions"
            tone="green"
            items={snapshot.inclusion_items}
            onChange={(inclusion_items) =>
              patch({
                inclusion_items,
                inclusions: contentBlocksToStrings(inclusion_items),
              })
            }
          />
          <EditableBlocks
            title="Exclusions"
            tone="red"
            items={snapshot.exclusion_items}
            onChange={(exclusion_items) =>
              patch({
                exclusion_items,
                exclusions: contentBlocksToStrings(exclusion_items),
              })
            }
          />
        </div>

        {/* Fixed master policies */}
        <PolicyAccordion
          title="Terms & Conditions"
          icon={<Info className="h-5 w-5" />}
          tone="stone"
          items={MASTER_TERMS}
        />
        <PolicyAccordion
          title="Cancellation & Refund Policy"
          icon={<Info className="h-5 w-5" />}
          tone="orange"
          items={MASTER_CANCELLATION}
        />
        <PolicyAccordion
          title="Payment Policy"
          icon={<Target className="h-5 w-5" />}
          tone="violet"
          items={MASTER_PAYMENT}
        />

        {/* Theme */}
        <section className="no-print rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 print:hidden">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-stone-900">
            <Palette className="h-5 w-5 text-[#7B1E2E]" />
            Select a Theme
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {THEMES.map((theme) => {
              const selected = (snapshot.preview_theme ?? 1) === theme.id;
              const label = themeCardLabel(theme, {
                title: snapshot.header.title,
                durationLabel: snapshot.header.duration_label,
              });
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => patch({ preview_theme: theme.id })}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border-2 p-1 text-left transition",
                    selected ? "border-[#7B1E2E]" : "border-transparent hover:border-stone-300"
                  )}
                >
                  {selected && (
                    <span className="absolute right-2 top-2 z-10 rounded bg-[#7B1E2E] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                      Selected
                    </span>
                  )}
                  <div className="relative h-28 overflow-hidden rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={theme.heroImage}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div
                      className={cn(
                        "absolute inset-0 bg-gradient-to-br opacity-80",
                        theme.gradient
                      )}
                    />
                    <div className="relative z-10 flex h-full flex-col items-center justify-center gap-1 px-2 text-center text-white">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-lg font-bold text-stone-800 shadow">
                        {theme.id}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide drop-shadow-sm">
                        {theme.styleName}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 px-1 text-center text-[11px] font-medium leading-snug text-stone-700">
                    {label}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Contacts */}
        <section className="no-print rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 print:hidden">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-stone-900">Select Contact</h2>
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
              Admin - All Contacts
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PREVIEW_CONTACTS.map((c) => {
              const selected = snapshot.selected_contact_id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => patch({ selected_contact_id: c.id })}
                  className={cn(
                    "relative rounded-xl border p-3 text-left transition",
                    selected
                      ? "border-blue-600 bg-blue-50/40 ring-1 ring-blue-600"
                      : "border-stone-200 hover:border-stone-300"
                  )}
                >
                  {selected && (
                    <span className="absolute right-2 top-2 rounded bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                      Selected
                    </span>
                  )}
                  <p className="font-semibold text-stone-900">{c.name}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-stone-600">
                    <Phone className="h-3.5 w-3.5" />
                    {c.phone}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-stone-600">
                    <Mail className="h-3.5 w-3.5" />
                    {c.email}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pb-8 pt-4 print:hidden">
          <button
            type="button"
            className="text-sm font-medium text-stone-600 hover:text-stone-900"
            onClick={() => router.push(`/itinerary-builder/${itineraryId}`)}
          >
            Back to Edit
          </button>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="bg-teal-800 hover:bg-teal-900" onClick={handleSave}>
              <Save className="h-4 w-4" />
              Save
            </Button>
            <Button type="button" className="bg-sky-500 hover:bg-sky-600" onClick={handleDownloadPdf}>
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button type="button" className="bg-teal-700 hover:bg-teal-800" onClick={handlePreview}>
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <Button type="button" className="bg-[#7B1E2E] hover:bg-[#5C0F1A]" onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
