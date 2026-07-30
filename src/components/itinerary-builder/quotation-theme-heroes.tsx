import type { ReportBrand } from "@/lib/branding/report-brand";
import type { PreviewTheme } from "@/lib/itinerary-builder/preview-themes";
import type { CoveringDestination } from "@/lib/itinerary-builder/quotation-layout";
import type { ItinerarySnapshot } from "@/types/itinerary-builder";
import { QuotationReviewWidgets } from "@/components/itinerary-builder/quotation-review-widgets";
import { formatInr } from "@/lib/itinerary-builder/cost-engine";
import { formatDate } from "@/lib/utils";
import { Mail, MapPin, Phone } from "lucide-react";

type HeroProps = {
  theme: PreviewTheme;
  brand: ReportBrand;
  clientLabel: string;
  client: ItinerarySnapshot["client"];
  header: ItinerarySnapshot["header"];
  destinationsSummary: string;
  /** Theme 2 covering chips (Jaipur -2N). Falls back to destinationsSummary. */
  coveringDestinations?: CoveringDestination[];
  packagePrice?: number | null;
  quoteId: string;
  versionNumber: number;
  contactName?: string | null;
};

function guestGreeting(clientLabel: string, clientName: string | null | undefined): string {
  const name = (clientLabel || clientName || "there").trim();
  return `Hi, ${name}`;
}

function BrandMark({ brand, size = "md" }: { brand: ReportBrand; size?: "md" | "lg" }) {
  if (brand.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={brand.logoUrl}
        alt={brand.companyName}
        className={
          size === "lg"
            ? "h-16 w-auto object-contain object-left"
            : "h-12 max-w-[160px] object-contain object-left"
        }
      />
    );
  }
  return (
    <div
      className={
        size === "lg"
          ? "flex h-16 w-16 items-center justify-center rounded-xl bg-white/20 text-sm font-bold text-white"
          : "flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-sm font-bold text-white"
      }
    >
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
  coveringDestinations,
  packagePrice,
}: HeroProps) {
  const wa = brand.phone.replace(/\D/g, "");
  const titleLine = (header.title || "").toUpperCase();
  const cityChips =
    coveringDestinations && coveringDestinations.length > 0
      ? coveringDestinations.map((d) => d.destination)
      : destinationsSummary
          .split(/\s*->\s*/)
          .map((s) => s.trim())
          .filter(Boolean);
  const priceLabel =
    packagePrice != null && packagePrice > 0
      ? `${formatInr(packagePrice)}/-`
      : null;

  return (
    <header
      className="relative overflow-hidden bg-white px-6 py-4"
      style={{ fontFamily: "var(--font-nunito), \"Nunito Sans\", sans-serif" }}
    >
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

      <div className="relative mb-4 flex w-full items-center justify-between px-0 py-4 sm:px-0">
        <BrandMark brand={brand} size="lg" />
        <a
          href={`https://wa.me/${wa}`}
          target="_blank"
          rel="noopener noreferrer"
          className="no-print flex items-center gap-2 rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-green-600 print:hidden"
        >
          <Phone className="h-4 w-4" />
          {brand.phone.startsWith("+") ? brand.phone : `+${brand.phone}`}
        </a>
      </div>

      <div className="hero-wrapper relative mx-auto flex min-h-[50vh] flex-col lg:min-h-[60vh] lg:flex-row print:h-auto">
        <div className="hero-left order-2 w-full p-6 text-lg md:p-12 lg:order-1 lg:w-1/2">
          <h1 className="mt-10 text-2xl font-bold text-black sm:text-3xl lg:text-4xl">
            {guestGreeting(clientLabel, client.client_name)},
          </h1>
          <p className="mt-4 text-gray-500">
            Here is the package exclusively designed/tailor made <br /> for you
          </p>
          {header.duration_label && (
            <div className="mt-6">
              <span className="rounded-md bg-yellow-300 px-4 py-2 text-sm font-bold text-[#343333] shadow-md sm:text-lg">
                {header.duration_label}
              </span>
            </div>
          )}
          {titleLine && (
            <div className="mt-6">
              <p className="text-2xl font-bold uppercase leading-snug text-pretty text-black sm:text-3xl">
                {titleLine}
              </p>
            </div>
          )}
          {priceLabel && (
            <div className="mb-4 mt-2 flex items-center justify-between text-2xl sm:text-3xl md:text-4xl">
              <span className="font-bold text-gray-900">{priceLabel}</span>
            </div>
          )}
          {cityChips.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 gap-y-2 text-sm font-medium text-gray-700 sm:mt-4 sm:text-lg">
              {cityChips.map((city) => (
                <p key={city} className="flex items-center gap-1">
                  <span>•</span> {city}{" "}
                </p>
              ))}
            </div>
          )}
          <div className="mt-6 flex flex-col items-center justify-between gap-6 md:items-start">
            <QuotationReviewWidgets
              layout="stack"
              accentClassName="text-gray-500"
              className="w-full md:w-auto"
              titleClassName="font-semibold text-lg text-gray-700"
            />
            <div className="no-print flex w-full flex-wrap items-center gap-3 md:w-auto print:hidden">
              <button
                type="button"
                className="w-full rounded-lg bg-yellow-600 px-8 py-3 text-3xl font-semibold text-white sm:w-auto sm:min-w-[280px]"
              >
                Book Now
              </button>
            </div>
          </div>
        </div>

        <div className="relative order-1 mx-auto flex w-full items-center justify-center p-6 lg:order-2 lg:w-1/2">
          <div className="relative mx-auto aspect-square w-full max-w-[340px]">
            <div className="absolute -left-4 top-6 h-28 w-28 rounded-full bg-gradient-to-br from-yellow-300 to-green-500 opacity-80" />
            <div className="absolute -bottom-2 -right-2 h-36 w-36 rounded-full bg-gradient-to-br from-lime-300 to-yellow-300 opacity-70" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={theme.heroImage}
              alt=""
              className="relative z-10 h-full w-full rounded-full object-cover shadow-xl ring-4 ring-white"
            />
          </div>
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
  coveringDestinations,
  packagePrice,
}: HeroProps) {
  const circles = theme.gallery.slice(0, 3);
  const wa = brand.phone.replace(/\D/g, "");
  const titleLine = header.title || "";
  const cityChips =
    coveringDestinations && coveringDestinations.length > 0
      ? coveringDestinations.map((d) => d.destination)
      : destinationsSummary
          .split(/\s*->\s*/)
          .map((s) => s.trim())
          .filter(Boolean);
  const priceLabel =
    packagePrice != null && packagePrice > 0 ? `${formatInr(packagePrice)}/-` : null;

  return (
    <header
      className="relative z-[2] overflow-hidden bg-[#FBF7F0] px-4 py-4 sm:px-6 lg:px-8"
      style={{ fontFamily: "var(--font-poltawski), \"Poltawski Nowy\", serif" }}
    >
      <div className="mb-4 flex w-full items-center justify-between px-4 py-4 sm:px-6">
        <BrandMark brand={brand} />
        <a
          href={`https://wa.me/${wa}`}
          target="_blank"
          rel="noopener noreferrer"
          className="no-print flex items-center gap-2 rounded-md bg-red-900 px-3 py-2 text-xs font-medium text-white transition-all hover:bg-red-800 sm:px-4 sm:text-sm print:hidden"
        >
          <Phone className="h-4 w-4" />
          {wa || brand.phone}
        </a>
      </div>

      <section className="pt-4 sm:pt-6 md:pt-8">
        <div className="flex flex-col flex-wrap items-start justify-between gap-6 lg:flex-row lg:gap-0">
          <div className="order-2 w-full lg:order-1 lg:w-1/2">
            <h1 className="mt-4 text-2xl font-bold leading-tight sm:mt-6 sm:text-3xl md:text-4xl">
              {guestGreeting(clientLabel, client.client_name)},
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-gray-700 md:text-lg">
              Here is the package exclusively designed / tailor made for you
            </p>
            {header.duration_label && (
              <div className="mt-4 inline-block rounded bg-red-900 px-4 py-1.5 text-sm font-medium text-white sm:mt-6 md:text-lg">
                {header.duration_label}
              </div>
            )}
            {titleLine && (
              <h3 className="mt-5 text-lg font-bold leading-snug sm:mt-7 md:text-2xl">
                {titleLine.toUpperCase()}
              </h3>
            )}
            {priceLabel && (
              <div className="mb-4 mt-2 flex items-center justify-between text-2xl sm:text-3xl md:text-4xl">
                <span className="font-bold text-red-900">{priceLabel}</span>
              </div>
            )}
            {cityChips.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 gap-y-2 text-xs font-medium text-gray-700 sm:mt-4 sm:text-lg">
                {cityChips.map((city) => (
                  <p key={city} className="flex items-center gap-1">
                    <MapPin className="h-2 w-2 shrink-0 text-red-900 sm:h-3.5 sm:w-3.5" />
                    {city}
                  </p>
                ))}
              </div>
            )}
            <div className="mt-6 flex flex-col gap-4">
              <QuotationReviewWidgets
                layout="stack"
                accentClassName="text-red-900"
                className="w-full max-w-md"
                titleClassName="font-semibold text-lg"
              />
            </div>
          </div>

          <div className="relative order-1 mx-auto h-80 w-80 lg:order-2">
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
      </section>
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
}: HeroProps) {
  const travelDateLabel = client.travel_date ? formatDate(client.travel_date) : null;
  return (
    <header className="overflow-hidden">
      <div className="quotation-hero-cover relative min-h-[300px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={theme.heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#8B3A1A]/90 via-[#C45C26]/75 to-transparent" />
        <div className="relative flex min-h-[300px] flex-col justify-between px-6 py-6 text-white">
          <div className="flex items-center gap-3">
            <BrandMark brand={brand} />
          </div>
          <div className="max-w-xl pb-2">
            <p className="text-sm text-orange-100">{guestGreeting(clientLabel, client.client_name)},</p>
            {header.duration_label && (
              <span className="mt-3 inline-block rounded-md bg-white/20 px-3 py-1 text-sm font-semibold backdrop-blur">
                {header.duration_label}
              </span>
            )}
            <h1 className="mt-3 text-2xl font-bold uppercase leading-tight sm:text-3xl">{header.title}</h1>
            {destinationsSummary && (
              <p className="mt-2 text-sm text-orange-50">• {destinationsSummary}</p>
            )}
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
}: HeroProps) {
  const travelDateLabel = client.travel_date ? formatDate(client.travel_date) : null;
  return (
    <header className="overflow-hidden bg-[#0D1B2A] text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
        <BrandMark brand={brand} />
        <a
          href={`tel:${brand.phone.replace(/\s/g, "")}`}
          className="text-[11px] text-sky-200/80 hover:text-sky-100"
        >
          {brand.phone}
        </a>
      </div>
      <div className="grid gap-6 px-6 py-8 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-sm text-sky-200">{guestGreeting(clientLabel, client.client_name)},</p>
          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-amber-300">Palace Indigo Night</p>
          {header.duration_label && (
            <span className="mt-4 inline-block rounded border border-amber-300/50 px-3 py-1 text-sm text-amber-100">
              {header.duration_label}
            </span>
          )}
          <h1 className="mt-4 font-serif text-2xl font-bold uppercase leading-tight sm:text-3xl">
            {header.title}
          </h1>
          {destinationsSummary && (
            <p className="mt-3 text-sm text-sky-100/90">• {destinationsSummary}</p>
          )}
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
