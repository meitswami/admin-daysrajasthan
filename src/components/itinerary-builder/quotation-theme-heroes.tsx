import type { ReportBrand } from "@/lib/branding/report-brand";
import type { PreviewTheme } from "@/lib/itinerary-builder/preview-themes";
import type { ItinerarySnapshot } from "@/types/itinerary-builder";
import { QuotationReviewWidgets } from "@/components/itinerary-builder/quotation-review-widgets";
import { formatDate } from "@/lib/utils";
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
  contactName?: string | null;
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

/** Theme 1 — Legacy of Maharajas (brochure cover matching rajasthantouring SenduserviewData) */
export function Theme1Hero({
  brand,
  clientLabel,
  client,
  header,
  destinationsSummary,
  quoteId,
  contactName,
}: HeroProps) {
  const travelDateLabel = client.travel_date ? formatDate(client.travel_date) : null;
  const unitLine = "(A Unit of Karni Kripa Holidays)";
  const address =
    brand.address ||
    "74, Deewan Nagar, Daulatpura Road, Khora Bisal Benar Jaipur, Rajasthan India 302012";
  const website = (brand.websiteUrl || "www.rajasthantouring.com").replace(/^https?:\/\//i, "");
  const phone = brand.phone || "+919351549292";
  const email = brand.email || "rajasthantouringjaipur@gmail.com";

  return (
    <header className="overflow-hidden bg-white">
      <section className="relative w-full overflow-hidden rounded-lg bg-white shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/theme-assets/legacy/cover-1.svg"
          alt={brand.companyName || "Rajasthan Touring"}
          className="block h-auto w-full object-cover md:object-contain"
        />

        {/* Company contact overlay (top-right), matching reference brochure */}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-end px-3 py-4 sm:px-6 sm:py-6">
          <div className="pointer-events-auto w-[58%] max-w-xl text-right text-stone-800 sm:w-[55%]">
            <p className="text-xs font-extrabold sm:text-lg md:text-2xl lg:text-3xl">{unitLine}</p>
            <div className="mt-3 space-y-2 text-[10px] font-semibold leading-snug sm:mt-5 sm:space-y-3 sm:text-sm md:text-base lg:text-xl">
              <p className="inline-flex items-start justify-end gap-2">
                <span className="max-w-[90%] text-right">{address}</span>
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500 sm:h-4 sm:w-4" />
              </p>
              <p className="inline-flex items-center justify-end gap-2">
                <a href={`tel:${phone.replace(/\s/g, "")}`} className="underline">
                  {phone}
                </a>
                <Phone className="h-3.5 w-3.5 shrink-0 text-orange-500 sm:h-4 sm:w-4" />
              </p>
              <p className="inline-flex items-center justify-end gap-2">
                <a
                  href={`https://${website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all hover:underline"
                >
                  {website}
                </a>
                <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-[10px] font-bold text-orange-500 sm:h-4 sm:w-4 sm:text-xs">
                  www
                </span>
              </p>
              <p className="inline-flex items-center justify-end gap-2">
                <a href={`mailto:${email}`} className="break-all hover:underline">
                  {email}
                </a>
                <Mail className="h-3.5 w-3.5 shrink-0 text-orange-500 sm:h-4 sm:w-4" />
              </p>
            </div>
          </div>
        </div>

        {/* Client + duration over mustard band */}
        <div className="absolute bottom-[11%] left-1/2 w-[72%] max-w-3xl -translate-x-1/2 text-center sm:bottom-[12%]">
          <h1 className="text-[clamp(14px,3.2vw,42px)] font-bold leading-tight text-white">
            {clientLabel || client.client_name || "Guest"}
            {client.adults && client.adults > 1 ? " & Family" : ""}
          </h1>
          <p
            className="mt-1 text-[clamp(11px,1.8vw,22px)] font-semibold leading-tight text-stone-900"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
            {header.duration_label || destinationsSummary || quoteId}
          </p>
          {contactName && (
            <p className="mt-1 text-[10px] text-white/90 sm:text-xs">Consultant: {contactName}</p>
          )}
        </div>

        {travelDateLabel && (
          <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-stone-800/20 bg-white/90 px-3 py-1 text-[10px] font-bold text-stone-900 sm:bottom-2 sm:px-4 sm:text-sm md:text-base">
            Travel Date:—
            <span className="text-[#C45C26]">{travelDateLabel}</span>
          </div>
        )}
      </section>
    </header>
  );
}

/** Theme 2 — Royal Circle Heritage (SenduserviewData3) */
export function Theme2Hero({
  theme,
  brand,
  clientLabel,
  client,
  header,
  destinationsSummary,
  contactName,
}: HeroProps) {
  const wa = brand.phone.replace(/\D/g, "");
  const titleLine = [clientLabel || client.client_name, header.title]
    .filter(Boolean)
    .join(" || ")
    .toUpperCase();

  return (
    <header className="relative overflow-hidden bg-white px-6 py-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/theme-assets/reviews/corner-pattern.png"
        alt=""
        className="pointer-events-none absolute -left-20 -top-24 w-44 opacity-30 print:hidden"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/theme-assets/reviews/corner-pattern.png"
        alt=""
        className="pointer-events-none absolute -bottom-24 -right-20 w-44 opacity-30 print:hidden"
      />

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BrandMark brand={brand} />
          <div>
            <p className="text-sm font-bold text-stone-900">{brand.companyName}</p>
            <p className="text-[11px] text-stone-500">
              {contactName ? `Consultant: ${contactName}` : "Experience the World"}
            </p>
          </div>
        </div>
        <a
          href={`https://wa.me/${wa}`}
          target="_blank"
          rel="noopener noreferrer"
          className="no-print inline-flex items-center gap-2 rounded-lg bg-[#56AB2F] px-4 py-2 text-sm font-semibold text-white shadow-sm print:hidden"
        >
          <Phone className="h-4 w-4" />
          {brand.phone.startsWith("+") ? brand.phone : `+${brand.phone}`}
        </a>
      </div>

      <div className="relative mt-8 grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 sm:text-4xl">
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
            {titleLine || header.title}
          </h2>
          {destinationsSummary && (
            <p className="mt-3 text-sm text-stone-600">• {destinationsSummary}</p>
          )}
          <QuotationReviewWidgets
            layout="stack"
            accentClassName="text-[#8B4513]"
            className="mt-5"
          />
          <div className="no-print mt-6 flex flex-wrap items-center gap-3 print:hidden">
            <a
              href="#book"
              className="inline-flex items-center rounded-lg bg-[#C9A227] px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#B8921F]"
            >
              Book Now
            </a>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-[#56AB2F] shadow-sm"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              Generate PDF
            </button>
          </div>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[340px]">
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
    </header>
  );
}

/** Theme 3 — Parchment Heritage (SenduserviewData4) */
export function Theme3Hero({
  theme,
  brand,
  clientLabel,
  client,
  header,
  destinationsSummary,
  contactName,
}: HeroProps) {
  const circles = theme.gallery.slice(0, 3);
  const wa = brand.phone.replace(/\D/g, "");
  const titleLine = [clientLabel || client.client_name, header.title]
    .filter(Boolean)
    .join(" || ")
    .toUpperCase();

  return (
    <header className="relative overflow-hidden bg-[#FBF7F0] px-6 py-6">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-10 opacity-25 sm:w-14"
        style={{
          backgroundImage:
            "url(/theme-assets/reviews/corner-pattern.png), repeating-linear-gradient(180deg, #7B1E2E22 0 2px, transparent 2px 12px)",
          backgroundSize: "140px auto, auto",
          backgroundRepeat: "repeat-y, repeat",
          backgroundPosition: "left top, 0 0",
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-10 opacity-25 sm:w-14"
        style={{
          backgroundImage:
            "url(/theme-assets/reviews/corner-pattern.png), repeating-linear-gradient(180deg, #7B1E2E22 0 2px, transparent 2px 12px)",
          backgroundSize: "140px auto, auto",
          backgroundRepeat: "repeat-y, repeat",
          backgroundPosition: "right top, 0 0",
        }}
      />

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BrandMark brand={brand} />
          <div>
            <p className="text-sm font-bold text-[#7B1E2E]">{brand.companyName}</p>
            {contactName && <p className="text-[11px] text-stone-500">{contactName}</p>}
          </div>
        </div>
        <a
          href={`https://wa.me/${wa}`}
          target="_blank"
          rel="noopener noreferrer"
          className="no-print inline-flex items-center gap-2 rounded-lg bg-[#7B1E2E] px-4 py-2 text-sm font-semibold text-white print:hidden"
        >
          <Phone className="h-4 w-4" />
          {wa || brand.phone}
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
            {titleLine || header.title}
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
          <QuotationReviewWidgets
            layout="stack"
            accentClassName="text-[#7B1E2E]"
            className="mt-5"
          />
          <button
            type="button"
            className="no-print mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#7B1E2E] print:hidden"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            Generate PDF
          </button>
        </div>

        <div className="relative mx-auto h-80 w-80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={circles[0] ?? theme.heroImage}
            alt=""
            className="absolute left-10 top-8 h-52 w-52 rounded-full object-cover shadow-lg ring-4 ring-white"
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
            className="absolute bottom-4 right-2 h-32 w-36 rounded-[50%] object-cover shadow-md ring-4 ring-white"
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
  contactName,
}: HeroProps) {
  const travelDateLabel = client.travel_date ? formatDate(client.travel_date) : null;
  return (
    <header className="overflow-hidden">
      <div className="quotation-hero-cover relative min-h-[300px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={theme.heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#8B3A1A]/90 via-[#C45C26]/75 to-transparent" />
        <div className="relative flex min-h-[300px] flex-col justify-between px-6 py-6 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <BrandMark brand={brand} />
              <div>
                <p className="text-sm font-bold">{brand.companyName}</p>
                {contactName && <p className="text-[11px] text-orange-100">{contactName}</p>}
              </div>
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
            {travelDateLabel && (
              <p className="mt-2 text-xs text-orange-100">Travel Date: {travelDateLabel}</p>
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
  contactName,
}: HeroProps) {
  const travelDateLabel = client.travel_date ? formatDate(client.travel_date) : null;
  return (
    <header className="overflow-hidden bg-[#0D1B2A] text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <BrandMark brand={brand} />
          <div>
            <p className="text-sm font-bold">{brand.companyName}</p>
            <p className="text-[11px] text-sky-200/80">
              {contactName ? `${contactName} · ${brand.phone}` : brand.phone}
            </p>
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
          {travelDateLabel && (
            <p className="mt-2 text-xs text-sky-200/70">Travel Date: {travelDateLabel}</p>
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
