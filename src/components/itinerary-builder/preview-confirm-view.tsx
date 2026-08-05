"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  formatInr,
  advanceRateFromPercent,
  categoryTotalsFromSnapshot,
} from "@/lib/itinerary-builder/cost-engine";
import { normalizeSnapshot } from "@/lib/itinerary-builder/normalize";
import {
  findHotelByOptionLabel,
  hotelFromWebsiteItem,
  type HotelMasterItem,
} from "@/lib/itinerary-builder/hotel-master";
import { listMasterContent } from "@/lib/master-data/content-store";
import {
  contentBlocksToStrings,
  PREVIEW_CONTACTS,
  type ContentBlockItem,
  type PolicyLine,
  type PreviewContact,
} from "@/lib/itinerary-builder/policy-master";
import {
  canSelectAnyQuotationContact,
  contactsFromStructure,
  contactsVisibleToMember,
} from "@/lib/itinerary-builder/quotation-contacts";
import { getCompanyStructure } from "@/lib/master-data/structure-store";
import {
  listMasterPolicies,
  policiesForSection,
} from "@/lib/master-data/policies-store";
import {
  OPTIONAL_INCLUSIONS,
  resolveOptionalInclusionFromMaster,
} from "@/lib/itinerary-builder/defaults";
import {
  isHardcodedPolicyDefaults,
  listInclusionExclusions,
  masterToContentBlocks,
  policyFieldsFromMaster,
  type InclusionExclusionItem,
  type InclusionExclusionKind,
} from "@/lib/master-data/inclusions-store";
import { publicQuotationUrl } from "@/lib/admin-public-url";
import { useSystem } from "@/components/providers/system-provider";
import {
  SELECTABLE_PREVIEW_THEMES,
  themeCardLabel,
} from "@/lib/itinerary-builder/preview-themes";
import {
  createClientItineraryFromSnapshot,
  getClientItinerary,
  getRevisions,
  saveSnapshotRevision,
} from "@/lib/itinerary-builder/storage";
import {
  clearWizardDraft,
  getOrCreateDraftPreviewId,
  loadWizardDraft,
  saveWizardDraft,
} from "@/lib/itinerary-builder/wizard-draft";
import type { ClientItineraryRecord, ItineraryDay, ItinerarySnapshot } from "@/types/itinerary-builder";
import {
  dayViewForCategory,
  hotelLabelsForCategoryPicks,
  getCategoryHotelPicks,
} from "@/lib/itinerary-builder/category-hotels";
import { formatDate, cn } from "@/lib/utils";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
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
  const labels = day.breakfast_hotels.filter(Boolean) as string[];
  if (labels.length > 0) return Array.from(new Set(labels));
  return day.hotel_name ? [day.hotel_name] : [];
}

/** Meal / plan bullets for a hotel option on a day (preview cards). */
function hotelSelectionBullets(day: ItineraryDay, label: string): string[] {
  if (day.guest_self_booked_hotel) {
    return ["Guest Accommodation (own management)"];
  }
  if (day.epai_plan_only) {
    return ["EPAI (Stay Only)"];
  }
  const bullets: string[] = [];
  if (day.breakfast_hotels.includes(label)) bullets.push("Breakfast");
  if (day.lunch_hotels.includes(label)) bullets.push("Lunch");
  if (day.dinner_hotels.includes(label)) bullets.push("Dinner");
  return bullets;
}

function travelerCount(client: ItinerarySnapshot["client"]): number {
  return (
    (client.adults || 0) +
    (client.children_5_12 || 0) +
    (client.children_below_5 || 0)
  );
}

function countLabel(value: number | null | undefined): string | null {
  return value == null ? null : String(value);
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
  const [openId, setOpenId] = useState<string | null>(
    items.find((i) => i.description?.trim())?.id ?? null
  );
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
          const hasBody = Boolean(item.description?.trim());
          return (
            <div key={item.id} className="overflow-hidden rounded-xl border border-white/80 bg-white">
              {hasBody ? (
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
              ) : (
                <div
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium",
                    itemTone
                  )}
                >
                  <span>{item.title}</span>
                </div>
              )}
              {open && hasBody ? (
                <div className="border-t border-stone-100 px-4 py-3 text-sm text-stone-600">
                  {item.description}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function blockKey(item: Pick<ContentBlockItem, "id" | "title">): string {
  return `${item.id}::${item.title.trim().toLowerCase()}`;
}

function isSamePolicyBlock(a: ContentBlockItem, b: ContentBlockItem): boolean {
  if (a.id && b.id && a.id === b.id) return true;
  return a.title.trim().toLowerCase() === b.title.trim().toLowerCase();
}

function masterBlockSelected(
  selected: ContentBlockItem[],
  masterBlock: ContentBlockItem
): boolean {
  return selected.some((s) => isSamePolicyBlock(s, masterBlock));
}

/** Searchable multi-select from Master Data (Select2-style). Titles only — no notes. */
function MasterPolicyPicker({
  title,
  tone,
  kind,
  master,
  items,
  onChange,
}: {
  title: string;
  tone: "green" | "red";
  kind: InclusionExclusionKind;
  master: InclusionExclusionItem[];
  items: ContentBlockItem[];
  onChange: (next: ContentBlockItem[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const masterBlocks = useMemo(
    () => masterToContentBlocks(master, kind),
    [master, kind]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return masterBlocks;
    return masterBlocks.filter((b) => b.title.toLowerCase().includes(q));
  }, [masterBlocks, query]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function toggleMaster(block: ContentBlockItem) {
    if (masterBlockSelected(items, block)) {
      onChange(items.filter((s) => !isSamePolicyBlock(s, block)));
    } else {
      onChange([...items, block]);
    }
  }

  function removeItem(item: ContentBlockItem) {
    onChange(items.filter((s) => blockKey(s) !== blockKey(item)));
  }

  const wrap = tone === "green" ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50";
  const head = tone === "green" ? "text-emerald-800" : "text-red-800";
  const accent =
    tone === "green"
      ? "border-emerald-300 focus-within:ring-emerald-500/30"
      : "border-red-300 focus-within:ring-red-500/30";

  return (
    <section className={cn("rounded-2xl border p-4", wrap)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className={cn("flex items-center gap-2 text-lg font-semibold", head)}>
          {tone === "green" ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
          {title}
        </h2>
        <span className="text-xs font-medium text-stone-500">
          {items.length} selected
          {masterBlocks.length ? ` · ${masterBlocks.length} in master` : ""}
        </span>
      </div>

      <div ref={rootRef} className="relative mb-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2.5 text-left text-sm shadow-sm transition focus-within:ring-2",
            accent
          )}
        >
          <span className="text-stone-500">
            Search &amp; select {title.toLowerCase()} from master…
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-stone-400 transition", open && "rotate-180")} />
        </button>

        {open && (
          <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
            <div className="border-b border-stone-100 p-2">
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${title.toLowerCase()}…`}
                className="h-9"
              />
            </div>
            <ul className="max-h-56 overflow-y-auto py-1">
              {!masterBlocks.length ? (
                <li className="px-3 py-4 text-center text-sm text-stone-500">
                  No master {title.toLowerCase()} yet. Add them under Master Data →
                  Inclusions &amp; Exclusions.
                </li>
              ) : !filtered.length ? (
                <li className="px-3 py-4 text-center text-sm text-stone-500">No matches</li>
              ) : (
                filtered.map((block) => {
                  const checked = masterBlockSelected(items, block);
                  return (
                    <li key={block.id}>
                      <button
                        type="button"
                        onClick={() => toggleMaster(block)}
                        className={cn(
                          "flex w-full items-start gap-2.5 px-3 py-2 text-left text-sm hover:bg-stone-50",
                          checked && "bg-emerald-50/60"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                            checked
                              ? tone === "green"
                                ? "border-emerald-600 bg-emerald-600 text-white"
                                : "border-red-600 bg-red-600 text-white"
                              : "border-stone-300 bg-white"
                          )}
                        >
                          {checked ? <Check className="h-3 w-3" /> : null}
                        </span>
                        <span className="font-medium text-stone-800">{block.title}</span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {!items.length ? (
          <p className="rounded-xl border border-dashed border-stone-200 bg-white/70 px-3 py-4 text-center text-sm text-stone-500">
            None selected — use the search above to pick from master {title.toLowerCase()}.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={blockKey(item)}
              className="flex items-start justify-between gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2.5 shadow-sm"
            >
              <p className="min-w-0 flex-1 text-sm font-medium text-stone-900">{item.title}</p>
              <button
                type="button"
                onClick={() => removeItem(item)}
                className="shrink-0 rounded-md p-1 text-stone-400 hover:bg-red-50 hover:text-red-600"
                title={`Remove ${item.title}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

const THEMES = SELECTABLE_PREVIEW_THEMES;

export function PreviewConfirmView({
  itineraryId,
  draftMode = false,
}: {
  itineraryId?: string;
  /** Unsaved new-itinerary preview — does not appear in the list until Save. */
  draftMode?: boolean;
}) {
  const router = useRouter();
  const { show } = useToast();
  const { currentMember } = useSystem();
  const [record, setRecord] = useState<ClientItineraryRecord | null>(null);
  const [snapshot, setSnapshot] = useState<ItinerarySnapshot | null>(null);
  const [allContacts, setAllContacts] = useState<PreviewContact[]>(PREVIEW_CONTACTS);
  const [draftMissing, setDraftMissing] = useState(false);
  const [policyMaster, setPolicyMaster] = useState<InclusionExclusionItem[]>([]);
  const [policyMasterLoaded, setPolicyMasterLoaded] = useState(false);
  const policyDefaultsHydratedRef = useRef(false);
  const [termsPolicies, setTermsPolicies] = useState<PolicyLine[]>([]);
  const [cancellationPolicies, setCancellationPolicies] = useState<PolicyLine[]>([]);
  const [paymentPolicies, setPaymentPolicies] = useState<PolicyLine[]>([]);
  const [hotelCatalog, setHotelCatalog] = useState<HotelMasterItem[]>([]);

  const contacts = useMemo(
    () => contactsVisibleToMember(allContacts, currentMember),
    [allContacts, currentMember]
  );
  const canPickAnyContact = canSelectAnyQuotationContact(currentMember.role);

  useEffect(() => {
    void getCompanyStructure().then((s) => setAllContacts(contactsFromStructure(s)));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void listMasterContent("hotels").then((rows) => {
      if (cancelled) return;
      setHotelCatalog(
        rows.map(hotelFromWebsiteItem).filter((h): h is HotelMasterItem => Boolean(h))
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void listInclusionExclusions()
      .then((rows) => setPolicyMaster(rows))
      .catch(() => setPolicyMaster([]))
      .finally(() => setPolicyMasterLoaded(true));
  }, []);

  useEffect(() => {
    void listMasterPolicies()
      .then((rows) => {
        setTermsPolicies(policiesForSection(rows, "terms"));
        setCancellationPolicies(policiesForSection(rows, "cancellation"));
        setPaymentPolicies(policiesForSection(rows, "payment"));
      })
      .catch(() => {
        setTermsPolicies([]);
        setCancellationPolicies([]);
        setPaymentPolicies([]);
      });
  }, []);

  useEffect(() => {
    if (draftMode) {
      const draft = loadWizardDraft();
      if (!draft) {
        setDraftMissing(true);
        setRecord(null);
        setSnapshot(null);
        return;
      }
      setDraftMissing(false);
      setRecord(null);
      setSnapshot(normalizeSnapshot(draft.snapshot));
      return;
    }
    if (!itineraryId) return;

    let cancelled = false;

    async function load() {
      let r = getClientItinerary(itineraryId!);
      let revs = getRevisions(itineraryId!);

      const { isRealDataMode } = await import("@/lib/system/data-mode");
      if (isRealDataMode() && (!r || !revs.length)) {
        const { pullRevisionsFromSupabaseIfReal } = await import(
          "@/lib/itinerary-builder/sync-real"
        );
        await pullRevisionsFromSupabaseIfReal(itineraryId!);
        if (cancelled) return;
        r = getClientItinerary(itineraryId!);
        revs = getRevisions(itineraryId!);
      }

      if (cancelled) return;
      const current = revs.find((rev) => rev.id === r?.current_revision_id) ?? revs[0];
      if (r && current) {
        setRecord(r);
        setSnapshot(normalizeSnapshot(current.snapshot));
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [itineraryId, draftMode]);

  /**
   * Default-select Master Data inclusions/exclusions (except optional add-ons).
   * Runs once when the picker would otherwise be empty / demo stubs.
   * Saved real selections are left untouched; optional items stay available to tick.
   */
  useEffect(() => {
    if (!snapshot || !policyMasterLoaded || policyDefaultsHydratedRef.current) return;

    const needInc = isHardcodedPolicyDefaults(snapshot.inclusion_items, "inclusion");
    const needExc = isHardcodedPolicyDefaults(snapshot.exclusion_items, "exclusion");
    if (!needInc && !needExc) {
      policyDefaultsHydratedRef.current = true;
      return;
    }

    policyDefaultsHydratedRef.current = true;
    const fromMaster = policyFieldsFromMaster(policyMaster);

    setSnapshot((prev) => {
      if (!prev) return prev;
      const stillNeedInc = isHardcodedPolicyDefaults(prev.inclusion_items, "inclusion");
      const stillNeedExc = isHardcodedPolicyDefaults(prev.exclusion_items, "exclusion");
      if (!stillNeedInc && !stillNeedExc) return prev;
      const next = normalizeSnapshot({
        ...prev,
        ...(stillNeedInc
          ? {
              inclusion_items: fromMaster.inclusion_items,
              inclusions: fromMaster.inclusions,
            }
          : {}),
        ...(stillNeedExc
          ? {
              exclusion_items: fromMaster.exclusion_items,
              exclusions: fromMaster.exclusions,
            }
          : {}),
      });
      if (draftMode) {
        const existing = loadWizardDraft();
        saveWizardDraft({
          snapshot: next,
          packageId: existing?.packageId ?? next.source_package_id,
        });
      }
      return next;
    });
  }, [snapshot, policyMaster, policyMasterLoaded, draftMode]);

  // Non-admins: lock selection to their own Structure contact.
  useEffect(() => {
    if (!snapshot || canPickAnyContact || contacts.length === 0) return;
    const lockedId = contacts[0].id;
    if (snapshot.selected_contact_id === lockedId) return;
    setSnapshot((prev) =>
      prev ? normalizeSnapshot({ ...prev, selected_contact_id: lockedId }) : prev
    );
  }, [snapshot, canPickAnyContact, contacts]);

  if (draftMode && draftMissing) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 text-center text-sm text-stone-500">
        <p>No unsaved itinerary draft found.</p>
        <Button type="button" variant="outline" onClick={() => router.push("/itinerary-builder/new")}>
          Back to New Itinerary
        </Button>
      </div>
    );
  }

  if (!snapshot || (!draftMode && !record)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-stone-500">
        Loading preview…
      </div>
    );
  }

  const activeId = record?.id ?? itineraryId;
  /** Quote ID (QRT…) only after an explicit Save — never invent one for drafts. */
  const quoteLabel = record?.quote_id ?? null;
  const backHref = draftMode
    ? "/itinerary-builder/new"
    : activeId
      ? `/itinerary-builder/${activeId}`
      : "/itinerary-builder";

  /**
   * Soft `router.push` from `…/[id]/preview-confirm` → `…/[id]` often no-ops in the
   * App Router (same dynamic segment). Hard navigation always remounts the builder.
   */
  function handleBack(e?: { preventDefault: () => void }) {
    e?.preventDefault();
    if (typeof window !== "undefined") {
      window.location.assign(backHref);
      return;
    }
    router.push(backHref);
  }

  function patch(partial: Partial<ItinerarySnapshot>) {
    setSnapshot((prev) => {
      if (!prev) return prev;
      const next = normalizeSnapshot({ ...prev, ...partial });
      if (draftMode) {
        const existing = loadWizardDraft();
        saveWizardDraft({
          snapshot: next,
          packageId: existing?.packageId ?? next.source_package_id,
        });
      }
      return next;
    });
  }

  async function persistExisting(synced: ItinerarySnapshot, id: string) {
    const result = saveSnapshotRevision(id, synced, {
      save_type: "manual",
      milestone_label: "Preview & Confirm",
    });
    if (!result) {
      show("Failed to save");
      return null;
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
    try {
      await fetch(`/api/public/quotation/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote_id: result.record.quote_id,
          version_number: result.revision.version_number,
          revision_id: result.revision.id,
          client_name: result.record.client_name,
          snapshot: result.revision.snapshot,
          category_totals: result.record.category_totals ?? [],
        }),
      });
    } catch {
      // Public publish is best-effort
    }
    return result;
  }

  async function handleSave() {
    if (!snapshot) return;
    const synced = normalizeSnapshot({
      ...snapshot,
      inclusions: contentBlocksToStrings(snapshot.inclusion_items),
      exclusions: contentBlocksToStrings(snapshot.exclusion_items),
    });

    if (draftMode && !record) {
      try {
        const created = createClientItineraryFromSnapshot(synced, {
          created_by: currentMember.name,
          owner_name: currentMember.name,
        });
        clearWizardDraft();
        show(`Saved ${created.quote_id}`);
        router.replace(`/itinerary-builder/${created.id}/preview-confirm`);
        return {
          record: created,
          revision: getRevisions(created.id)[0]!,
        };
      } catch (err) {
        show(err instanceof Error ? err.message : "Could not save itinerary");
        return null;
      }
    }

    if (!activeId) {
      show("Failed to save");
      return null;
    }
    return persistExisting(synced, activeId);
  }

  /**
   * Preview only — opens the quotation in a new tab without saving to the itinerary list.
   * Unsaved drafts use a temporary session id; QRT is allotted only on explicit Save.
   */
  async function handlePreviewPublic() {
    if (!snapshot) return;

    const synced = normalizeSnapshot({
      ...snapshot,
      inclusions: contentBlocksToStrings(snapshot.inclusion_items),
      exclusions: contentBlocksToStrings(snapshot.exclusion_items),
    });

    // Keep theme / contact edits in the unsaved draft (not a list Save).
    if (draftMode) {
      const existing = loadWizardDraft();
      saveWizardDraft({
        snapshot: synced,
        packageId: existing?.packageId ?? synced.source_package_id,
      });
    }

    let previewId: string;
    let quoteId: string;
    let versionNumber: number;
    let revisionId: string;
    let clientName: string;

    if (record) {
      previewId = record.id;
      quoteId = record.quote_id;
      versionNumber = Math.max(1, record.current_version || 1);
      revisionId = record.current_revision_id || `preview-${Date.now()}`;
      clientName = record.client_name?.trim() || synced.client.client_name?.trim() || "Guest";
    } else {
      previewId = getOrCreateDraftPreviewId();
      quoteId = "PREVIEW";
      versionNumber = 1;
      revisionId = `draft-preview-${Date.now()}`;
      clientName = synced.client.client_name?.trim() || "Guest";
    }

    const category_totals =
      record?.category_totals?.length ? record.category_totals : categoryTotalsFromSnapshot(synced);

    try {
      await fetch(`/api/public/quotation/${previewId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote_id: quoteId,
          version_number: versionNumber,
          revision_id: revisionId,
          client_name: clientName,
          snapshot: synced,
          category_totals,
        }),
      });
    } catch {
      // Still open — same-browser print view may fall back to local data when saved
    }

    const publicUrl = publicQuotationUrl(previewId, null, synced.preview_theme);
    try {
      await navigator.clipboard.writeText(publicUrl);
      show("Opening preview (not saved to itinerary list)…");
    } catch {
      show("Opening preview…");
    }
    window.open(publicUrl, "_blank", "noopener,noreferrer");
  }

  const primaryTier = snapshot.category_pricing;
  const advanceRate = advanceRateFromPercent(snapshot.advance_percent);
  const clientLabel = [snapshot.client.title, snapshot.client.client_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  const dayCount = snapshot.days.length;
  const heroSubtitle =
    snapshot.header.subtitle?.trim() ||
    (dayCount > 0 ? `${dayCount} Days Amazing Journey` : "Amazing Journey");
  const tierHeroPrices = primaryTier.length
    ? primaryTier.map((tier) => ({
        key: tier.category_key,
        label: tier.label,
        price: tier.package_price || tier.grand_total || 0,
      }))
    : [
        {
          key: "final",
          label: "Selected Package",
          price: snapshot.final_price ?? 0,
        },
      ];
  const PREVIEW_HERO_IMAGE =
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80";

  return (
    <div className="min-h-screen bg-[#f0fdf4]">
      <div className="no-print sticky top-0 z-30 bg-[#164e63] px-4 py-3.5 shadow-md print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
              <Eye className="h-4 w-4" />
            </div>
            <div>
              <p className="text-base font-bold text-white sm:text-lg">
                Preview & Confirm
              </p>
              <p className="text-xs text-white/70 sm:text-sm">
                Review your customized itinerary
                {quoteLabel ? ` · ${quoteLabel}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={backHref}
              onClick={handleBack}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              )}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <Button
              type="button"
              size="sm"
              className="bg-[#84cc16] text-white hover:bg-[#75b812]"
              onClick={() => void handleSave()}
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-slate-100 text-slate-800 hover:bg-white"
              onClick={() => void handlePreviewPublic()}
              title="Open preview in a new tab without saving"
            >
              <Eye className="h-4 w-4" />
              Preview
              <ExternalLink className="h-3.5 w-3.5 opacity-70" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 print:max-w-none">
        {/* Hero banner — matches Booking Preview top section */}
        <section className="relative mb-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#164e63] via-[#164e63] to-[#84cc16] shadow-lg sm:mb-4 sm:rounded-3xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PREVIEW_HERO_IMAGE}
            alt=""
            className="absolute inset-0 h-full w-full object-cover mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative flex min-h-[220px] flex-col justify-between p-4 sm:min-h-[260px] sm:p-8">
            <div>
              {snapshot.header.duration_label && (
                <span className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm sm:text-sm">
                  {snapshot.header.duration_label}
                </span>
              )}
              <h1 className="mt-3 max-w-3xl text-xl font-bold leading-tight text-white sm:text-2xl md:text-3xl">
                {snapshot.header.title || "New Itinerary"}
              </h1>
              <p className="mt-2 text-sm text-white/90 sm:text-base">{heroSubtitle}</p>
            </div>
            <div className="mt-6 space-y-2 rounded-xl bg-black/25 px-4 py-3 backdrop-blur-sm sm:px-5">
              <p className="text-xs text-white/75 sm:text-sm">Whole Group/Family</p>
              {tierHeroPrices.map((tier) => (
                <div
                  key={tier.key}
                  className="flex flex-wrap items-end justify-between gap-3"
                >
                  <p className="text-sm font-semibold text-white sm:text-base">
                    {tier.label}
                  </p>
                  <p className="text-xl font-bold text-white sm:text-2xl">
                    {formatInr(tier.price)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Client + package summary (above itinerary days) */}
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-base font-bold text-[#164e63]">Client Details</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {(
                [
                  ["Name", clientLabel || null],
                  ["Email", snapshot.client.email?.trim() || null],
                  ["Email 2", snapshot.client.email2?.trim() || null],
                  ["Phone", snapshot.client.phone?.trim() || null],
                  ["Adults", countLabel(snapshot.client.adults)],
                  ["Kids (5–12 Years)", countLabel(snapshot.client.children_5_12)],
                  ["Kids (Below 5 Years)", countLabel(snapshot.client.children_below_5)],
                  [
                    "Total Travelers",
                    travelerCount(snapshot.client) > 0
                      ? String(travelerCount(snapshot.client))
                      : null,
                  ],
                  ["Rooms", countLabel(snapshot.client.rooms)],
                  ["Extra Mattress", countLabel(snapshot.client.extra_beds)],
                  [
                    "Travel Date",
                    snapshot.client.travel_date
                      ? formatDate(snapshot.client.travel_date)
                      : null,
                  ],
                  [
                    "Food Preference",
                    snapshot.client.food_preference?.trim() || null,
                  ],
                  [
                    "Special Requests",
                    snapshot.client.special_requests?.trim() || null,
                  ],
                ] as const
              )
                .filter(([, value]) => value != null && value !== "")
                .map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 border-b border-stone-100 pb-2 last:border-0 last:pb-0">
                  <dt className="shrink-0 font-medium text-stone-500">{label}</dt>
                  <dd className="text-right font-medium text-stone-900">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-base font-bold text-[#164e63]">Package Summary</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {snapshot.header.duration_label ? (
                <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-2">
                  <dt className="shrink-0 font-medium text-stone-500">Duration</dt>
                  <dd className="text-right font-medium text-stone-900">
                    {snapshot.header.duration_label}
                  </dd>
                </div>
              ) : null}
              {primaryTier.length > 0 ? (
                primaryTier.map((tier) => (
                  <div
                    key={tier.category_key}
                    className="flex items-start justify-between gap-4 border-b border-stone-100 pb-2 last:border-0 last:pb-0"
                  >
                    <dt className="shrink-0 font-medium text-stone-500">
                      Base Price ({tier.label})
                    </dt>
                    <dd className="text-right font-medium text-stone-900">
                      {formatInr(tier.package_price || tier.grand_total || 0)}
                    </dd>
                  </div>
                ))
              ) : snapshot.final_price != null && snapshot.final_price > 0 ? (
                <div className="flex items-start justify-between gap-4 pb-0">
                  <dt className="shrink-0 font-medium text-stone-500">Base Price</dt>
                  <dd className="text-right font-medium text-stone-900">
                    {formatInr(snapshot.final_price)}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>
        </div>

        {/* Day cards */}
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            {snapshot.days.map((day) => {
              const primaryKey = snapshot.category_pricing[0]?.category_key ?? null;
              const tierHotelBlocks =
                snapshot.category_pricing.length > 0
                  ? snapshot.category_pricing.map((tier) => {
                      const view = dayViewForCategory(
                        day,
                        tier.category_key,
                        tier.room_category,
                        primaryKey
                      );
                      const picks = getCategoryHotelPicks(
                        day,
                        tier.category_key,
                        tier.room_category,
                        primaryKey
                      );
                      return {
                        key: tier.category_key,
                        label: tier.label,
                        view,
                        hotels: hotelLabelsForCategoryPicks(picks),
                        selfBooked: picks.guest_self_booked_hotel,
                        epai: picks.epai_plan_only,
                      };
                    })
                  : [
                      {
                        key: "legacy",
                        label:
                          day.epai_plan_only
                            ? "Stay Only"
                            : "Hotels",
                        view: day,
                        hotels: hotelLabelsForDay(day),
                        selfBooked: day.guest_self_booked_hotel,
                        epai: day.epai_plan_only,
                      },
                    ];
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
                      {(() => {
                        const locs = [
                          day.location,
                          ...(day.locations ?? []),
                          !day.location ? day.pickup_location : null,
                        ]
                          .map((l) => l?.trim())
                          .filter(Boolean) as string[];
                        const unique = Array.from(new Set(locs));
                        if (!unique.length) return null;
                        return (
                          <p className="mt-1 inline-flex items-center gap-1 text-sm text-stone-600">
                            <MapPin className="h-3.5 w-3.5 text-blue-600" />
                            {unique.join(" · ")}
                          </p>
                        );
                      })()}
                      {day.day_description && (
                        <p className="mt-2 text-sm text-stone-600 line-clamp-3">{day.day_description}</p>
                      )}
                      <div className="mt-3 space-y-3">
                        {tierHotelBlocks.map((block) =>
                          block.selfBooked ? (
                            <div
                              key={block.key}
                              className="rounded-xl bg-stone-50 px-3 py-2 text-sm text-stone-600"
                            >
                              <p className="font-semibold text-stone-800">{block.label}</p>
                              <p className="mt-1">
                                No hotels booked — guest arranging own accommodation.
                              </p>
                              <ul className="mt-1 list-disc pl-5 text-xs text-stone-500">
                                <li>Guest Accommodation (own management)</li>
                              </ul>
                            </div>
                          ) : block.hotels.length > 0 ? (
                            <div
                              key={block.key}
                              className="rounded-xl border border-stone-100 bg-stone-50 p-3"
                            >
                              <p className="text-sm font-semibold text-stone-800">
                                {block.label}
                                {block.epai ? " - Stay Only" : ""}
                              </p>
                              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-stone-500">
                                Hotel Options
                              </p>
                              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                {block.hotels.slice(0, 4).map((label) => {
                                  const hotel = findHotelByOptionLabel(
                                    label,
                                    hotelCatalog,
                                    block.view?.location ?? null
                                  );
                                  const bullets = hotelSelectionBullets(block.view, label);
                                  return (
                                    <div
                                      key={`${block.key}-${label}`}
                                      className="rounded-lg border border-stone-200 bg-white p-2"
                                    >
                                      <div className="flex items-center gap-2">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        {hotel?.image_url ? (
                                          <img
                                            src={hotel.image_url}
                                            alt=""
                                            className="h-12 w-12 shrink-0 rounded object-cover"
                                          />
                                        ) : (
                                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-stone-100 text-[10px] text-stone-400">
                                            No photo
                                          </div>
                                        )}
                                        <div className="min-w-0">
                                          <p className="truncate text-sm font-medium text-stone-900">
                                            {hotel?.name ?? label.split(" - ")[0]}
                                          </p>
                                          <p className="text-xs text-amber-600">
                                            ★ {hotel?.rating?.toFixed(1) ?? "—"}{" "}
                                            {hotel?.location ? (
                                              <span className="text-stone-400">
                                                · {hotel.location}
                                              </span>
                                            ) : null}
                                          </p>
                                        </div>
                                      </div>
                                      {bullets.length > 0 && (
                                        <ul className="mt-1.5 list-disc pl-4 text-[11px] text-stone-500">
                                          {bullets.map((b) => (
                                            <li key={b}>{b}</li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null
                        )}
                      </div>
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

        {/* Inclusions / Exclusions — pick from Master Data (searchable) */}
        <div className="grid gap-4 lg:grid-cols-2">
          <MasterPolicyPicker
            title="Inclusions"
            tone="green"
            kind="inclusion"
            master={policyMaster}
            items={snapshot.inclusion_items}
            onChange={(inclusion_items) =>
              patch({
                inclusion_items,
                inclusions: contentBlocksToStrings(inclusion_items),
              })
            }
          />
          <MasterPolicyPicker
            title="Exclusions"
            tone="red"
            kind="exclusion"
            master={policyMaster}
            items={snapshot.exclusion_items}
            onChange={(exclusion_items) =>
              patch({
                exclusion_items,
                exclusions: contentBlocksToStrings(exclusion_items),
              })
            }
          />
        </div>

        {snapshot.optional_inclusion_keys.length > 0 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 sm:p-5">
            <h2 className="text-base font-bold text-amber-900">Optional Inclusions</h2>
            <ul className="mt-3 space-y-2 text-sm text-stone-800">
              {OPTIONAL_INCLUSIONS.filter((o) =>
                snapshot.optional_inclusion_keys.includes(o.key)
              ).map((o) => {
                const { description } = resolveOptionalInclusionFromMaster(o, policyMaster);
                return (
                  <li key={o.key} className="rounded-lg border border-amber-100 bg-white px-3 py-2">
                    <p className="font-semibold">{o.label}</p>
                    {description ? (
                      <p className="mt-0.5 text-xs text-stone-600">{description}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Master policies from database */}
        <PolicyAccordion
          title="Terms & Conditions"
          icon={<Info className="h-5 w-5" />}
          tone="stone"
          items={termsPolicies}
        />
        <PolicyAccordion
          title="Cancellation & Refund Policy"
          icon={<Info className="h-5 w-5" />}
          tone="orange"
          items={cancellationPolicies}
        />
        <PolicyAccordion
          title="Payment Policy"
          icon={<Target className="h-5 w-5" />}
          tone="violet"
          items={paymentPolicies}
        />

        {/* Theme */}
        <section className="no-print rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 print:hidden">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-stone-900">
            <Palette className="h-5 w-5 text-[#7B1E2E]" />
            Select a Theme
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            After selecting a theme, use <span className="font-semibold text-teal-800">Preview</span> to
            open it in a new tab (no Save required). Use <span className="font-semibold">Save</span> only
            when you want it on the itinerary list.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {THEMES.map((theme) => {
              const selected = (snapshot.preview_theme ?? 2) === theme.id;
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
            <h2 className="text-lg font-semibold text-stone-900">
              {canPickAnyContact ? "Select Contact" : "Your Contact"}
            </h2>
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
              From Structure Master
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {contacts.map((c) => {
              const selected = snapshot.selected_contact_id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={!canPickAnyContact}
                  onClick={() => {
                    if (!canPickAnyContact) return;
                    patch({ selected_contact_id: c.id });
                  }}
                  className={cn(
                    "relative rounded-xl border p-3 text-left transition",
                    selected
                      ? "border-blue-600 bg-blue-50/40 ring-1 ring-blue-600"
                      : "border-stone-200 hover:border-stone-300",
                    !canPickAnyContact && "cursor-default"
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

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-stone-200 pb-8 pt-4 print:hidden">
          <Link
            href={backHref}
            onClick={handleBack}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "border-[#164e63]/30 text-[#164e63] hover:bg-[#164e63]/5"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <Button
            type="button"
            className="bg-[#84cc16] text-white hover:bg-[#75b812]"
            onClick={() => void handleSave()}
          >
            <Save className="h-4 w-4" />
            Save
          </Button>
          <Button
            type="button"
            className="bg-[#164e63] text-white hover:bg-[#0f3a4a]"
            onClick={() => void handlePreviewPublic()}
            title="Open preview in a new tab without saving"
          >
            <Eye className="h-4 w-4" />
            Preview
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </Button>
        </div>
      </div>
    </div>
  );
}
