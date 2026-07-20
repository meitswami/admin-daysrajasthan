import type { ReportBrand } from "@/lib/branding/report-brand";
import type { PreviewTheme } from "@/lib/itinerary-builder/preview-themes";
import type { ItinerarySnapshot } from "@/types/itinerary-builder";
import { Mail, MapPin, Phone, Printer } from "lucide-react";

type HeroProps = {
  theme: PreviewTheme;
  brand: ReportBrand;
  clientLabel: string;
  client: ItinerarySnapshot["client"];
  header: ItinerarySnapshot["header"];
  destinationsSummary: string;
  quoteId: string;
  versionNumber: number;
};

function BrandMark({ brand }: { brand: ReportBrand }) {
  if (brand.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={brand.logoUrl}
        alt={brand.companyName}
        className="h-12 max-w-[160px] object-contain object-left"
      />
    );
  }
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-sm font-bold text-white">
      {brand.shortName.slice(0, 3)}
    </div>
  );
}

/** Theme 1 — Legacy of Maharajas (mustard heritage cover) */
export function Theme1Hero({
  theme,
  brand,
  clientLabel,
  client,
  header,
  destinationsSummary,
  quoteId,
}: HeroProps) {
  return (
    <header className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E8D48B] bg-[#FFF8E7] px-6 py-4">
        <div className="flex items-center gap-3">
          <BrandMark brand={brand} />
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-[#8B6914]">{brand.companyName}</p>
            <p className="text-[11px] text-stone-500">{brand.email}</p>
          </div>
        </div>
        <div className="max-w-xs text-right text-[11px] leading-relaxed text-stone-600">
          {brand.address && (
            <p className="inline-flex items-start gap-1">
              <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-[#C9A227]" />
              {brand.address}
            </p>
          )}
          <p className="mt-1 inline-flex items-center gap-1">
            <Phone className="h-3 w-3 text-[#C9A227]" />
            {brand.phone}
          </p>
          <p className="mt-0.5 inline-flex items-center gap-1">
            <Mail className="h-3 w-3 text-[#C9A227]" />
            {brand.email}
          </p>
        </div>
      </div>

      <div className="relative min-h-[280px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={theme.heroImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="relative flex min-h-[280px] flex-col items-center justify-end px-6 pb-8 pt-16 text-center text-white">
          <p className="font-serif text-sm tracking-[0.35em] text-amber-100">THE LEGACY OF</p>
          <h1 className="mt-1 font-serif text-4xl font-bold tracking-wide sm:text-5xl">MAHARAJAS</h1>
          <p className="mt-2 font-serif text-3xl text-amber-50">राजस्थान</p>
        </div>
      </div>

      <div className="bg-[#C9A227] px-6 py-5 text-center text-white">
        <p className="font-serif text-2xl tracking-wide">पधारो म्हारे देश</p>
        <p className="mt-2 text-lg font-semibold">{clientLabel || client.client_name}</p>
        <p className="mt-1 text-sm text-amber-50">
          {header.duration_label}
          {client.adults ? ` · ${client.adults} Adults` : ""}
        </p>
        <p className="mt-2 text-xs uppercase tracking-widest text-amber-100">{header.title}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#1e293b] px-6 py-2 text-xs text-amber-200">
        <span>{quoteId}</span>
        {client.travel_date && <span>Travel Date: {client.travel_date}</span>}
        {destinationsSummary && <span className="truncate">{destinationsSummary}</span>}
      </div>

      <div
        className="flex items-center gap-4 px-6 py-4 text-white"
        style={{ backgroundImage: `linear-gradient(90deg, #8B6914, #C9A227)` }}
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-100">Explore Royal Rajasthan</p>
          <p className="font-serif text-xl italic">Your Rajasthan Travel Itinerary</p>
          <p className="mt-1 text-sm">खम्मा घणी</p>
        </div>
      </div>
    </header>
  );
}

/** Theme 2 — Royal Circle Heritage (yellow/lime circular hero) */
export function Theme2Hero({
  theme,
  brand,
  clientLabel,
  client,
  header,
  destinationsSummary,
}: HeroProps) {
  return (
    <header className="bg-white px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BrandMark brand={brand} />
          <div>
            <p className="text-sm font-bold text-stone-900">{brand.companyName}</p>
            <p className="text-[11px] text-stone-500">Experience the World</p>
          </div>
        </div>
        <a
          href={`https://wa.me/${brand.phone.replace(/\D/g, "")}`}
          className="no-print inline-flex items-center gap-2 rounded-full bg-[#56AB2F] px-4 py-2 text-sm font-semibold text-white"
        >
          <Phone className="h-4 w-4" />
          {brand.phone}
        </a>
      </div>

      <div className="mt-8 grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 sm:text-4xl">
            Hi {clientLabel || client.client_name || "there"},
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Here is the package exclusively designed / tailor made for you
          </p>
          {header.duration_label && (
            <span className="mt-4 inline-block rounded-lg bg-[#F5C518] px-3 py-1.5 text-sm font-bold text-stone-900">
              {header.duration_label}
            </span>
          )}
          <h2 className="mt-4 text-xl font-bold uppercase leading-snug text-stone-900 sm:text-2xl">
            {header.title}
          </h2>
          {destinationsSummary && (
            <p className="mt-3 text-sm text-stone-500">• {destinationsSummary.replace(/ • /g, " • ")}</p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <div className="rounded-xl border border-stone-200 bg-white px-3 py-2 shadow-sm">
              <p className="text-[10px] font-medium text-stone-500">Customer Reviews</p>
              <p className="text-sm font-semibold text-stone-800">★ ★ ★ ★ ★ 4.8</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white px-3 py-2 shadow-sm">
              <p className="text-[10px] font-medium text-stone-500">TripAdvisor Review</p>
              <p className="text-sm font-semibold text-stone-800">★ ★ ★ ★ ★ 4.8</p>
            </div>
          </div>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[320px]">
          <div className="absolute -left-4 top-6 h-28 w-28 rounded-full bg-gradient-to-br from-[#F5C518] to-[#56AB2F] opacity-80" />
          <div className="absolute -bottom-2 -right-2 h-36 w-36 rounded-full bg-gradient-to-br from-[#A8E063] to-[#F5C518] opacity-70" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={theme.heroImage}
            alt=""
            className="relative z-10 h-full w-full rounded-full object-cover shadow-xl ring-4 ring-white"
          />
        </div>
      </div>

      {/* Screen-only action — never printed / never in downloaded PDF */}
      <button
        type="button"
        className="no-print mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#56AB2F] print:hidden"
        onClick={() => window.print()}
      >
        <Printer className="h-4 w-4" />
        Generate PDF
      </button>
    </header>
  );
}

/** Theme 3 — Parchment Heritage (maroon + circular cluster) */
export function Theme3Hero({
  theme,
  brand,
  clientLabel,
  client,
  header,
  destinationsSummary,
}: HeroProps) {
  const circles = theme.gallery.slice(0, 3);
  return (
    <header className="relative overflow-hidden bg-[#FBF7F0] px-6 py-6">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-6 opacity-30"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, #7B1E2E 0 2px, transparent 2px 10px)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-6 opacity-30"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, #7B1E2E 0 2px, transparent 2px 10px)",
        }}
      />

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BrandMark brand={brand} />
          <p className="text-sm font-bold text-[#7B1E2E]">{brand.companyName}</p>
        </div>
        <a
          href={`https://wa.me/${brand.phone.replace(/\D/g, "")}`}
          className="no-print inline-flex items-center gap-2 rounded-full bg-[#7B1E2E] px-4 py-2 text-sm font-semibold text-white"
        >
          <Phone className="h-4 w-4" />
          {brand.phone}
        </a>
      </div>

      <div className="relative mt-8 grid items-start gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 sm:text-4xl">
            Hi {clientLabel || client.client_name || "there"},
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Here is the package exclusively designed / tailor made for you
          </p>
          {header.duration_label && (
            <span className="mt-4 inline-block rounded-md bg-[#7B1E2E] px-3 py-1.5 text-sm font-semibold text-white">
              {header.duration_label}
            </span>
          )}
          <h2 className="mt-4 text-xl font-bold uppercase leading-snug text-stone-900">
            {header.title}
          </h2>
          {destinationsSummary && (
            <div className="mt-3 flex flex-wrap gap-2 text-sm text-[#7B1E2E]">
              {destinationsSummary.split(" • ").map((d) => (
                <span key={d} className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {d}
                </span>
              ))}
            </div>
          )}
          <div className="mt-5 space-y-2">
            <div className="rounded-xl border border-stone-200 bg-white px-3 py-2">
              <p className="text-sm font-medium text-stone-800">★ ★ ★ ★ ★ 4.8 · 2542 Google Reviews</p>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white px-3 py-2">
              <p className="text-sm font-medium text-stone-800">★ ★ ★ ★ ★ 4.8 · 481 TripAdvisor Reviews</p>
            </div>
          </div>
          <button
            type="button"
            className="no-print mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#7B1E2E] print:hidden"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            Generate PDF
          </button>
        </div>

        <div className="relative mx-auto h-72 w-72">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={circles[0] ?? theme.heroImage}
            alt=""
            className="absolute left-8 top-6 h-48 w-48 rounded-full object-cover shadow-lg ring-4 ring-white"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={circles[1] ?? theme.heroImage}
            alt=""
            className="absolute left-0 top-0 h-28 w-28 rounded-full object-cover shadow-md ring-4 ring-white"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={circles[2] ?? theme.heroImage}
            alt=""
            className="absolute bottom-2 right-0 h-32 w-32 rounded-full object-cover shadow-md ring-4 ring-white"
          />
        </div>
      </div>
    </header>
  );
}

/** Theme 4 — Desert Sunset Trail */
export function Theme4Hero({
  theme,
  brand,
  clientLabel,
  client,
  header,
  destinationsSummary,
  quoteId,
}: HeroProps) {
  return (
    <header className="overflow-hidden">
      <div className="relative min-h-[300px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={theme.heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#8B3A1A]/90 via-[#C45C26]/75 to-transparent" />
        <div className="relative flex min-h-[300px] flex-col justify-between px-6 py-6 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <BrandMark brand={brand} />
              <p className="text-sm font-bold">{brand.companyName}</p>
            </div>
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs backdrop-blur">{quoteId}</span>
          </div>
          <div className="max-w-xl pb-2">
            <p className="text-sm text-orange-100">Hi {clientLabel || client.client_name || "there"},</p>
            {header.duration_label && (
              <span className="mt-3 inline-block rounded-md bg-white/20 px-3 py-1 text-sm font-semibold backdrop-blur">
                {header.duration_label}
              </span>
            )}
            <h1 className="mt-3 text-2xl font-bold uppercase leading-tight sm:text-3xl">{header.title}</h1>
            {destinationsSummary && <p className="mt-2 text-sm text-orange-50">{destinationsSummary}</p>}
            {client.travel_date && (
              <p className="mt-2 text-xs text-orange-100">Travel Date: {client.travel_date}</p>
            )}
          </div>
        </div>
      </div>
      <div className="bg-[#C45C26] px-6 py-3 text-center text-sm font-medium text-white">
        Desert trails · Fort cities · Golden hour Rajasthan
      </div>
    </header>
  );
}

/** Theme 5 — Palace Indigo Night */
export function Theme5Hero({
  theme,
  brand,
  clientLabel,
  client,
  header,
  destinationsSummary,
  quoteId,
}: HeroProps) {
  return (
    <header className="overflow-hidden bg-[#0D1B2A] text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <BrandMark brand={brand} />
          <div>
            <p className="text-sm font-bold">{brand.companyName}</p>
            <p className="text-[11px] text-sky-200/80">{brand.phone}</p>
          </div>
        </div>
        <span className="rounded-full border border-amber-300/40 px-3 py-1 text-xs text-amber-200">
          {quoteId}
        </span>
      </div>
      <div className="grid gap-6 px-6 py-8 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-sm text-sky-200">Hi {clientLabel || client.client_name || "there"},</p>
          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-amber-300">Palace Indigo Night</p>
          {header.duration_label && (
            <span className="mt-4 inline-block rounded border border-amber-300/50 px-3 py-1 text-sm text-amber-100">
              {header.duration_label}
            </span>
          )}
          <h1 className="mt-4 font-serif text-2xl font-bold uppercase leading-tight sm:text-3xl">
            {header.title}
          </h1>
          {destinationsSummary && <p className="mt-3 text-sm text-sky-100/90">{destinationsSummary}</p>}
          {client.travel_date && (
            <p className="mt-2 text-xs text-sky-200/70">Travel Date: {client.travel_date}</p>
          )}
        </div>
        <div className="relative mx-auto w-full max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={theme.heroImage}
            alt=""
            className="aspect-[4/3] w-full rounded-2xl object-cover shadow-2xl ring-1 ring-amber-300/30"
          />
          <div className="absolute -bottom-3 -left-3 rounded-xl bg-amber-400 px-3 py-2 text-xs font-bold text-[#0D1B2A] shadow">
            Royal lakeside evenings
          </div>
        </div>
      </div>
    </header>
  );
}

export function QuotationThemeHero(props: HeroProps) {
  switch (props.theme.id) {
    case 1:
      return <Theme1Hero {...props} />;
    case 2:
      return <Theme2Hero {...props} />;
    case 3:
      return <Theme3Hero {...props} />;
    case 4:
      return <Theme4Hero {...props} />;
    case 5:
      return <Theme5Hero {...props} />;
    default:
      return <Theme1Hero {...props} />;
  }
}
