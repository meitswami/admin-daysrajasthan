"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReportBrand } from "@/lib/branding/report-brand";
import type { ContentBlockItem, PreviewContact } from "@/lib/itinerary-builder/policy-master";
import { GOOGLE_REVIEWS_URL } from "@/lib/itinerary-builder/review-links";
import {
  listInclusionExclusions,
  resolvePolicyContentBlocks,
  type InclusionExclusionItem,
} from "@/lib/master-data/inclusions-store";
import {
  listMasterPolicies,
  policiesForSection,
} from "@/lib/master-data/policies-store";
import type { CompanyStructure } from "@/types/company-structure";
import {
  DEFAULT_ACHIEVEMENT_DESCRIPTION,
  DEFAULT_ACHIEVEMENT_IMAGES,
  DEFAULT_ACHIEVEMENT_NAME,
} from "@/types/company-structure";
import {
  Check,
  ChevronDown,
  ChevronUp,
  CircleX,
  CreditCard,
  FileText,
  Globe,
  Info,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const THEME2_ACCENT = "#56AB2F";
const THEME3_ACCENT = "#7F1D1D"; // red-900

export type TourPolicyVariant = "theme2" | "theme3";

type PolicyTabId =
  | "inclusions"
  | "exclusions"
  | "terms"
  | "cancellation"
  | "payment";

const TABS: { id: PolicyTabId; label: string; Icon: LucideIcon }[] = [
  { id: "inclusions", label: "Inclusions", Icon: Check },
  { id: "exclusions", label: "Exclusions", Icon: CircleX },
  { id: "terms", label: "Terms & Conditions", Icon: FileText },
  { id: "cancellation", label: "Cancellation & Refund Policy", Icon: RotateCcw },
  { id: "payment", label: "Payment Policy", Icon: CreditCard },
];

function PolicyAccordionItem({
  item,
  defaultOpen = false,
  accent,
  variant,
}: {
  item: ContentBlockItem;
  defaultOpen?: boolean;
  accent: string;
  variant: TourPolicyVariant;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyImage = item.images?.find(Boolean) ?? null;
  const hasBody = Boolean(item.description?.trim() || bodyImage);

  return (
    <div
      className={cn(
        "break-inside-avoid overflow-hidden rounded-xl border bg-white shadow-sm print:shadow-none",
        variant === "theme3" ? "border-stone-200" : "border-2 border-stone-200"
      )}
    >
      <button
        type="button"
        className={cn(
          "flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left sm:px-5",
          variant === "theme3"
            ? "bg-white hover:bg-[#F8E9EC]/40"
            : "bg-gradient-to-r from-stone-50 to-white hover:from-green-50"
        )}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: accent }}
          >
            {variant === "theme3" ? (
              <Info className="h-3.5 w-3.5" strokeWidth={2.5} />
            ) : (
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            )}
          </span>
          <span
            className={cn(
              "text-sm font-semibold text-stone-800 sm:text-base",
              variant === "theme3" ? "font-medium" : "font-bold"
            )}
          >
            {item.title}
          </span>
        </span>
        <span className="no-print shrink-0 print:hidden" style={{ color: accent }}>
          {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </span>
      </button>
      <div
        className={cn(
          "border-t border-stone-100 px-4 py-4 sm:px-5",
          open ? "block" : "hidden print:block"
        )}
      >
        {hasBody ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {bodyImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bodyImage}
                alt=""
                className="h-28 w-40 shrink-0 rounded-lg object-cover sm:h-32 sm:w-44"
              />
            )}
            {item.description?.trim() ? (
              <p className="text-sm leading-relaxed text-stone-600">{item.description}</p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm italic text-stone-400">No additional details.</p>
        )}
      </div>
    </div>
  );
}

function SimplePolicyCards({ lines }: { lines: string[] }) {
  return (
    <div className="space-y-3">
      {lines.map((line) => (
        <div
          key={line}
          className="break-inside-avoid rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-sm font-semibold text-stone-800 shadow-sm print:shadow-none sm:text-base"
        >
          {line}
        </div>
      ))}
    </div>
  );
}

export function Theme2TourPolicies({
  inclusionItems,
  exclusionItems,
  variant = "theme2",
  accent,
}: {
  inclusionItems: ContentBlockItem[];
  exclusionItems: ContentBlockItem[];
  variant?: TourPolicyVariant;
  accent?: string;
}) {
  const tone = accent ?? (variant === "theme3" ? THEME3_ACCENT : THEME2_ACCENT);
  const [tab, setTab] = useState<PolicyTabId>("inclusions");
  const [masterLibrary, setMasterLibrary] = useState<InclusionExclusionItem[]>([]);
  const [terms, setTerms] = useState<string[]>([]);
  const [cancellation, setCancellation] = useState<string[]>([]);
  const [payment, setPayment] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    void listInclusionExclusions().then((rows) => {
      if (!cancelled) setMasterLibrary(rows);
    });
    void listMasterPolicies()
      .then((rows) => {
        if (cancelled) return;
        setTerms(policiesForSection(rows, "terms").map((t) => t.title));
        setCancellation(policiesForSection(rows, "cancellation").map((t) => t.title));
        setPayment(policiesForSection(rows, "payment").map((t) => t.title));
      })
      .catch(() => {
        if (cancelled) return;
        setTerms([]);
        setCancellation([]);
        setPayment([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const panels = useMemo(() => {
    const inclusions = resolvePolicyContentBlocks(
      inclusionItems,
      null,
      masterLibrary,
      "inclusion"
    );
    const exclusions = resolvePolicyContentBlocks(
      exclusionItems,
      null,
      masterLibrary,
      "exclusion"
    );
    return {
      inclusions,
      exclusions,
      terms,
      cancellation,
      payment,
    };
  }, [inclusionItems, exclusionItems, masterLibrary, terms, cancellation, payment]);

  return (
    <section className="break-inside-avoid">
      <h2
        className={cn(
          "mb-4 font-semibold text-stone-700",
          variant === "theme3" ? "font-serif text-2xl text-stone-800 sm:text-3xl" : "text-xl sm:text-2xl"
        )}
      >
        Tour Policies
      </h2>

      {/* Screen tabs */}
      <div className="no-print mt-4 flex flex-wrap gap-x-5 gap-y-2 border-b border-stone-200 print:hidden">
        {TABS.map((t) => {
          const active = tab === t.id;
          const TabIcon = variant === "theme2" && t.id === "inclusions" ? Info : t.Icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 pb-2 text-sm transition-colors sm:text-base",
                active ? "border-b-2 font-semibold text-stone-900" : "text-stone-500 hover:text-stone-700"
              )}
              style={active ? { borderColor: tone, color: tone } : undefined}
            >
              <TabIcon className="h-4 w-4" style={{ color: active ? tone : undefined }} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Screen panel */}
      <div className="no-print mt-4 print:hidden">
        {tab === "inclusions" && (
          <div className="space-y-3">
            {panels.inclusions.map((item, i) => (
              <PolicyAccordionItem
                key={item.id}
                item={item}
                defaultOpen={i === 1}
                accent={tone}
                variant={variant}
              />
            ))}
          </div>
        )}
        {tab === "exclusions" && (
          <div className="space-y-3">
            {panels.exclusions.map((item, i) => (
              <PolicyAccordionItem
                key={item.id}
                item={item}
                defaultOpen={i === 0}
                accent={tone}
                variant={variant}
              />
            ))}
          </div>
        )}
        {tab === "terms" && <SimplePolicyCards lines={panels.terms} />}
        {tab === "cancellation" && <SimplePolicyCards lines={panels.cancellation} />}
        {tab === "payment" && <SimplePolicyCards lines={panels.payment} />}
      </div>

      {/* Print / PDF: all sections expanded */}
      <div className="mt-4 hidden space-y-8 print:block">
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide" style={{ color: tone }}>
            Inclusions
          </h3>
          <div className="space-y-3">
            {panels.inclusions.map((item) => (
              <PolicyAccordionItem
                key={`print-${item.id}`}
                item={item}
                defaultOpen
                accent={tone}
                variant={variant}
              />
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide" style={{ color: tone }}>
            Exclusions
          </h3>
          <div className="space-y-3">
            {panels.exclusions.map((item) => (
              <PolicyAccordionItem
                key={`print-${item.id}`}
                item={item}
                defaultOpen
                accent={tone}
                variant={variant}
              />
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide" style={{ color: tone }}>
            Terms & Conditions
          </h3>
          <SimplePolicyCards lines={panels.terms} />
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide" style={{ color: tone }}>
            Cancellation & Refund Policy
          </h3>
          <SimplePolicyCards lines={panels.cancellation} />
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide" style={{ color: tone }}>
            Payment Policy
          </h3>
          <SimplePolicyCards lines={panels.payment} />
        </div>
      </div>
    </section>
  );
}

export function Theme2About({
  structure,
  brand,
  variant = "theme2",
  accent,
}: {
  structure: CompanyStructure | null;
  brand: ReportBrand;
  variant?: TourPolicyVariant;
  accent?: string;
}) {
  const tone = accent ?? (variant === "theme3" ? THEME3_ACCENT : THEME2_ACCENT);
  const ach = structure?.achievements?.find((a) => a.name.trim()) ?? null;
  const title = ach?.name || DEFAULT_ACHIEVEMENT_NAME;
  const description = ach?.description || brand.siteDescription || DEFAULT_ACHIEVEMENT_DESCRIPTION;
  const images =
    ach?.image_urls?.filter(Boolean).length
      ? ach.image_urls.filter(Boolean)
      : [...DEFAULT_ACHIEVEMENT_IMAGES];
  const paragraphs = description.split(/\n\n+/).filter(Boolean);
  const website = brand.websiteUrl || "https://www.rajasthantouring.com";

  return (
    <section className="mt-10 space-y-8">
      <div>
        <h2
          className={cn(
            "font-bold text-gray-700",
            variant === "theme3" ? "font-serif text-2xl text-stone-800 sm:text-3xl" : "text-sm sm:text-lg"
          )}
        >
          {title}
        </h2>
        <div
          className={cn(
            "mt-4 grid gap-4 leading-relaxed text-gray-600 sm:grid-cols-2 sm:text-justify",
            variant === "theme3" ? "text-sm" : "text-sm sm:text-base"
          )}
        >
          {paragraphs.length >= 2 ? (
            <>
              <p className="whitespace-pre-wrap">{paragraphs[0]}</p>
              <p className="whitespace-pre-wrap">{paragraphs.slice(1).join("\n\n")}</p>
            </>
          ) : (
            <p className="whitespace-pre-wrap sm:col-span-2">{description}</p>
          )}
        </div>
      </div>

      <div>
        <h3
          className={cn(
            "mb-4 font-bold underline",
            variant === "theme3" ? "text-base text-sky-800" : "text-base text-gray-700"
          )}
          style={variant === "theme3" ? undefined : { textDecorationColor: tone }}
        >
          Achievements
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {images.slice(0, 3).map((src, i) => (
            <div key={`${src}-${i}`} className="overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="achievement" className="h-44 w-full object-cover md:h-52" />
            </div>
          ))}
        </div>
      </div>

      <div
        className={cn(
          "relative overflow-hidden rounded-xl px-4 py-10 text-center",
          variant === "theme3" && "bg-[#9F0712]"
        )}
        style={variant === "theme3" ? undefined : { backgroundColor: tone }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/theme-assets/reviews/corner-pattern.png"
          alt=""
          className="pointer-events-none absolute -left-10 -top-10 w-36 opacity-30 brightness-0 invert"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/theme-assets/reviews/corner-pattern.png"
          alt=""
          className="pointer-events-none absolute -bottom-10 -right-10 w-36 opacity-30 brightness-0 invert"
        />
        <a
          href={website.startsWith("http") ? website : `https://${website}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "relative inline-flex rounded-full border px-6 py-2.5 text-sm font-semibold shadow-sm",
            variant === "theme3"
              ? "border-white/90 bg-transparent text-white"
              : "border-white/80 bg-[#6BC23E] text-white"
          )}
        >
          Click To View About Our Travel Agency
        </a>
      </div>
    </section>
  );
}

export function Theme2Contact({
  brand,
  contact,
  structure,
  accent,
  variant = "theme2",
}: {
  brand: ReportBrand;
  contact: PreviewContact | null;
  structure: CompanyStructure | null;
  accent?: string;
  variant?: TourPolicyVariant;
}) {
  const tone = accent ?? (variant === "theme3" ? THEME3_ACCENT : THEME2_ACCENT);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const agentName = contact?.name || "Rajasthan Touring";
  const phone = contact?.phone || brand.phone || "+919351549292";
  const agentEmail = contact?.email || brand.email || "rajasthantouringjaipur@gmail.com";
  const address =
    brand.address ||
    "74, Deewan Nagar, Daulatpura Road, Khora Bisal, Benar, Jaipur, Rajasthan India - 302012";
  const sos = structure?.support_number || "9509911614";
  const social = structure?.social_links;
  const website =
    social?.website || brand.websiteUrl || "https://www.rajasthantouring.com";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`Enquiry from ${name || "Guest"}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\n${message || "(no message)"}`
    );
    window.open(`mailto:${agentEmail}?subject=${subject}&body=${body}`, "_blank");
  }

  return (
    <section className="mt-8">
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <form
          onSubmit={handleSubmit}
          className="no-print break-inside-avoid rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-6 print:hidden"
        >
          <h2
            className={cn(
              "mb-3 font-bold text-gray-800 sm:mb-4",
              variant === "theme2" ? "text-lg sm:text-xl md:text-2xl" : "text-xl"
            )}
          >
            Write to us
          </h2>
          <label className="mt-4 block text-sm text-stone-500">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border-0 bg-stone-100 px-3 py-2.5 text-stone-900 outline-none ring-0 focus:bg-stone-50"
              placeholder="Your name"
            />
          </label>
          <label className="mt-3 block text-sm text-stone-500">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border-0 bg-stone-100 px-3 py-2.5 text-stone-900 outline-none focus:bg-stone-50"
              placeholder="you@example.com"
            />
          </label>
          <label className="mt-3 block text-sm text-stone-500">
            Message
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="mt-1 w-full resize-y rounded-lg border-0 bg-stone-100 px-3 py-2.5 text-stone-900 outline-none focus:bg-stone-50"
              placeholder="How can we help?"
            />
          </label>
          <button
            type="submit"
            className="mt-4 w-full rounded-lg py-2.5 text-sm font-bold text-white"
            style={{ backgroundColor: tone }}
          >
            Submit
          </button>
        </form>

        <div className="break-inside-avoid rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
          <p
            className={cn(
              "mb-2 font-medium uppercase tracking-wide text-gray-600",
              variant === "theme2" ? "text-sm sm:text-lg" : "text-xs font-semibold text-stone-400"
            )}
          >
            CONTACT
          </p>
          <h2
            className={cn(
              "mb-4 font-bold text-gray-800",
              variant === "theme2" ? "text-2xl md:text-3xl lg:text-4xl" : "mt-2 text-2xl text-stone-900"
            )}
          >
            {agentName}
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-stone-500">Call To Expert</dt>
              <dd className="font-medium text-stone-900">
                <a href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a>
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Email</dt>
              <dd className="break-all font-medium text-stone-900">
                <a href={`mailto:${agentEmail}`}>{agentEmail}</a>
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Address</dt>
              <dd className="font-medium text-stone-900">{address}</dd>
            </div>
            <div>
              <dt className="text-stone-500">SOS Number</dt>
              <dd>
                <a
                  href={`tel:${sos.replace(/\s/g, "")}`}
                  className="font-medium text-sky-600 underline"
                >
                  {sos}
                </a>
              </dd>
            </div>
            <div>
              <a
                href={GOOGLE_REVIEWS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-sky-600 underline"
              >
                Get Direction
              </a>
            </div>
          </dl>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-stone-600">
            <span>Follow us:</span>
            {social?.facebook && (
              <a
                href={social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold hover:underline"
              >
                Facebook
              </a>
            )}
            {social?.instagram && (
              <a
                href={social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold hover:underline"
              >
                Instagram
              </a>
            )}
            {social?.youtube && (
              <a
                href={social.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold hover:underline"
              >
                YouTube
              </a>
            )}
            <a
              href={website.startsWith("http") ? website : `https://${website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold hover:underline"
            >
              <Globe className="h-4 w-4" />
              Website
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
