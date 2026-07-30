import type { ReportBrand } from "@/lib/branding/report-brand";
import { formatInr } from "@/lib/itinerary-builder/cost-engine";
import {
  bookingAmount,
  buildHotelPackageNights,
  buildNightSegments,
  DEFAULT_CANCELLATION_POLICY,
  DEFAULT_PAYMENT_POLICY,
  formatCoveringDestinations,
  formatDestinationsSummary,
  resolvePackageVehicles,
  tierRowsFromSnapshot,
  type CoveringDestination,
  type HotelPackageNight,
  type NightSegment,
} from "@/lib/itinerary-builder/quotation-layout";
import {
  dayGalleryImage,
  getPreviewTheme,
  type PreviewTheme,
} from "@/lib/itinerary-builder/preview-themes";
import {
  DEFAULT_EXCLUSION_ITEMS,
  DEFAULT_INCLUSION_ITEMS,
  PREVIEW_CONTACTS,
  contentBlocksToStrings,
  stringsToContentBlocks,
  type ContentBlockItem,
  type PreviewContact,
} from "@/lib/itinerary-builder/policy-master";
import { findSelectedContact } from "@/lib/itinerary-builder/quotation-contacts";
import {
  defaultPaymentDetailsFromSeed,
  type PaymentDetails,
} from "@/lib/itinerary-builder/payment-details";
import { findHotelByOptionLabel } from "@/lib/itinerary-builder/hotel-master";
import type { CompanyStructure } from "@/types/company-structure";
import type { CategoryTotalSummary, ItineraryDay, ItinerarySnapshot } from "@/types/itinerary-builder";
import { formatDate } from "@/lib/utils";
import { DocumentBrandFooter } from "@/components/branding/document-brand";
import { QuotationThemeHero } from "@/components/itinerary-builder/quotation-theme-heroes";
import { QuotationDayCarousel } from "@/components/itinerary-builder/quotation-day-carousel";
import { QuotationReviewWidgets } from "@/components/itinerary-builder/quotation-review-widgets";
import {
  Theme2About,
  Theme2Contact,
  Theme2TourPolicies,
} from "@/components/itinerary-builder/quotation-theme2-sections";
import { Theme3SideRails } from "@/components/itinerary-builder/quotation-theme3-shell";
import {
  QuotationLegacyAbout,
  QuotationLegacyExploreBanner,
  QuotationLegacyPaymentSection,
  QuotationLegacyPolicies,
} from "@/components/itinerary-builder/quotation-legacy-sections";
import { Car, Coffee, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
function brandWithSelectedContact(
  brand: ReportBrand,
  contact: PreviewContact | null
): ReportBrand {
  if (!contact) return brand;
  return {
    ...brand,
    phone: contact.phone || brand.phone,
    email: contact.email || brand.email,
  };
}

function policyLinesFromSnapshot(snapshot: ItinerarySnapshot): {
  inclusions: string[];
  exclusions: string[];
} {
  const inclusions =
    snapshot.inclusions?.length > 0
      ? snapshot.inclusions
      : contentBlocksToStrings(snapshot.inclusion_items ?? []);
  const exclusions =
    snapshot.exclusions?.length > 0
      ? snapshot.exclusions
      : contentBlocksToStrings(snapshot.exclusion_items ?? []);
  return { inclusions, exclusions };
}

function richPolicyItems(
  items: ContentBlockItem[] | undefined,
  fallbackLines: string[],
  defaults: ContentBlockItem[]
): ContentBlockItem[] {
  if (items && items.length > 0) {
    return items.filter((i) => i.title.trim());
  }
  if (fallbackLines.length > 0) {
    return stringsToContentBlocks(fallbackLines);
  }
  return defaults.map((i) => ({ ...i }));
}

function ClientDetailsTable({
  clientLabel,
  client,
  header,
  accent,
  title = "Client Details",
  variant = "default",
}: {
  clientLabel: string;
  client: ItinerarySnapshot["client"];
  header: ItinerarySnapshot["header"];
  accent: string;
  title?: string;
  variant?: "default" | "theme2" | "theme3";
}) {
  const rows = [
    ["Name", clientLabel],
    ["Email", client.email],
    ["Phone", client.phone],
    ["Adults", client.adults != null ? String(client.adults).padStart(2, "0") : null],
    ["Rooms", client.rooms != null ? String(client.rooms).padStart(2, "0") : null],
    ["Travel Date", client.travel_date ? formatDate(client.travel_date) : null],
  ].filter(([, value]) => value);

  if (variant === "theme3") {
    return (
      <section className="my-3 break-inside-avoid rounded-lg border-2 p-4 shadow-sm">
        <h2 className="mb-4 border-b pb-2 text-2xl font-semibold text-gray-700">{title}</h2>
        <div className="grid grid-cols-1 gap-4 bg-white text-lg md:grid-cols-2">
          {rows.map(([label, value]) => (
            <p key={label}>
              <strong>{label}:</strong> {value}
            </p>
          ))}
        </div>
        {header.tour_code && (
          <p className="mt-3 text-sm text-gray-500">
            Tour Code:{" "}
            <span className="font-semibold" style={{ color: accent }}>
              {header.tour_code}
            </span>
          </p>
        )}
      </section>
    );
  }

  if (variant === "theme2") {
    return (
      <section className="h-fit break-inside-avoid rounded-2xl border bg-white p-6 shadow-md">
        <h2 className="mb-4 text-xl font-bold text-gray-700">{title}</h2>
        <div className="space-y-2 text-base text-gray-700">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4">
              <span>{label}</span>
              <span className="text-right font-medium text-gray-900">{value}</span>
            </div>
          ))}
        </div>
        {header.tour_code && (
          <p className="mt-3 text-xs text-gray-500">
            Tour Code:{" "}
            <span className="font-semibold" style={{ color: accent }}>
              {header.tour_code}
            </span>
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="break-inside-avoid rounded-2xl border border-stone-200 bg-white p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: accent }}>
        {title}
      </h2>
      <table className="mt-3 w-full text-sm">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-stone-100 last:border-0">
              <td className="py-2 pr-4 font-medium text-stone-500">{label}</td>
              <td className="py-2 text-stone-900">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {header.tour_code && (
        <p className="mt-3 text-xs text-stone-500">
          Tour Code:{" "}
          <span className="font-semibold" style={{ color: accent }}>
            {header.tour_code}
          </span>
        </p>
      )}
    </section>
  );
}

function Theme3PackageSummaryCard({
  label,
  packagePrice,
  grandTotal,
  advancePercent,
}: {
  label: string;
  packagePrice: number;
  grandTotal: number;
  advancePercent: 20 | 30;
}) {
  const advance = bookingAmount(grandTotal, advancePercent / 100);
  const shortKey = label.replace(/ Package$/i, "").toLowerCase();
  return (
    <section className="my-3 break-inside-avoid rounded-lg border-2 p-4 shadow-sm">
      <h2 className="mb-4 border-b pb-2 text-2xl font-semibold text-gray-700">Package Summary</h2>
      <div className="bg-white p-1 text-lg">
        <h3 className="mb-6 text-2xl font-bold capitalize text-gray-900">{label}</h3>
        <div className="flex items-center justify-between border-b py-2 text-lg">
          <span className="font-semibold text-gray-700">Base Price</span>
          <span className="font-bold text-gray-900">{formatInr(packagePrice)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between border-b py-2 text-lg">
          <span className="font-semibold text-gray-700">Total ({shortKey})</span>
          <span className="font-bold text-green-700">{formatInr(grandTotal)}/-</span>
        </div>
        <div className="mt-2 flex items-center justify-between py-2 text-lg">
          <span className="font-semibold text-gray-700">Booking Amount ({shortKey})</span>
          <span className="font-bold text-red-700">{formatInr(advance)}/-</span>
        </div>
        <button
          type="button"
          className="mt-8 inline-block w-full rounded-xl bg-red-900 px-4 py-4 text-xl font-semibold text-white hover:bg-red-800"
        >
          Book Now
        </button>
      </div>
    </section>
  );
}

function Theme2PackagePriceCard({
  label,
  packagePrice,
  grandTotal,
  advancePercent,
}: {
  label: string;
  packagePrice: number;
  grandTotal: number;
  advancePercent: 20 | 30;
}) {
  const advance = bookingAmount(grandTotal, advancePercent / 100);
  const plain = (n: number) => `₹${Math.round(n)}/-`;
  return (
    <section className="w-full break-inside-avoid rounded-2xl border bg-white p-4 shadow-md sm:p-5 md:p-6">
      <h3 className="mb-4 text-2xl font-extrabold capitalize text-gray-700">{label}</h3>
      <div className="mb-2 flex justify-between text-gray-700">
        <span>Base Price</span>
        <span className="font-semibold">{plain(packagePrice)}</span>
      </div>
      <hr className="my-3" />
      <div className="flex justify-between font-semibold text-gray-900">
        <span>Total Price</span>
        <span>{plain(grandTotal)}</span>
      </div>
      <div className="my-1 flex justify-between text-gray-700">
        <span>Booking Amount</span>
        <span>{plain(advance)}</span>
      </div>
      <button
        type="button"
        className="mt-6 w-full rounded-xl bg-black py-3 text-center text-base font-semibold text-white"
      >
        Book Now
      </button>
    </section>
  );
}

function CoveringDestinationsRow({
  covering,
  vehicles,
  variant = "theme2",
  accent,
}: {
  covering: CoveringDestination[];
  vehicles: string[];
  variant?: "theme2" | "theme3";
  accent?: string;
}) {
  const isTheme3 = variant === "theme3";
  return (
    <div className="mb-6">
      <div
        className={cn(
          "text-lg font-extrabold sm:text-2xl md:text-3xl",
          isTheme3 ? "text-red-900" : "text-green-700"
        )}
        style={!isTheme3 && accent ? undefined : undefined}
      >
        Travel Itinerary
      </div>
      {covering.length > 0 && (
        <p className="mt-1 flex flex-wrap gap-2 text-gray-700">
          <span className={cn("text-xl", isTheme3 ? "text-red-900" : "text-green-600")}>
            Covering Destinations
          </span>
          {covering.map((item) =>
            isTheme3 ? (
              <span key={item.label} className="flex items-center gap-1">
                <Navigation className="mr-1 h-2 w-2 shrink-0 text-red-900" />
                <span className="font-semibold text-gray-800">{item.destination}</span>
                <span className="ml-1 text-sm text-red-900">-{item.nights}N</span>
              </span>
            ) : (
              <span key={item.label} className="mr-2 flex items-center gap-1 text-lg">
                <span className="text-yellow-500">•</span> {item.label}
              </span>
            )
          )}
        </p>
      )}
      {vehicles.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {vehicles.map((vehicle) => (
            <p
              key={vehicle}
              className={cn(
                "mb-2 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold capitalize text-white sm:text-lg",
                isTheme3 ? "bg-red-900" : "bg-[#00A63E]"
              )}
            >
              <Car className="h-5 w-5 shrink-0" strokeWidth={2} />
              {vehicle}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function Theme2HotelCard({
  option,
  checkIn,
  checkOut,
}: {
  option: HotelPackageNight["options"][number];
  checkIn: string | null;
  checkOut: string | null;
}) {
  const master =
    findHotelByOptionLabel(option.optionLabel) ??
    findHotelByOptionLabel(option.hotelName);
  const image =
    option.imageUrl ||
    master?.image_url ||
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80";
  const rating = master?.rating || option.rating;
  const reviews = option.reviewCount;
  const fullStars = Math.min(5, Math.round(rating));

  return (
    <div className="relative w-full max-w-[450px] rounded-2xl border-2 border-stone-200 bg-white p-6 shadow-lg">
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="h-40 w-full shrink-0 overflow-hidden rounded-xl shadow-md sm:w-40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={option.hotelName} className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <h3 className="text-xl font-bold text-stone-900">{option.hotelName}</h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 text-yellow-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i}>{i < fullStars ? "★" : "☆"}</span>
              ))}
              <span className="ml-1 text-xs text-stone-600">{rating.toFixed(1)}</span>
            </div>
            <span className="text-sm text-stone-600">({reviews} Reviews)</span>
          </div>
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(option.hotelName + " hotel photos")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 underline hover:text-blue-800"
          >
            View Photos
          </a>
          <div className="space-y-1 pt-2 text-sm text-stone-600">
            {checkIn && (
              <div className="flex gap-2">
                <span className="font-semibold text-stone-800">Check-in:</span>
                <span>{checkIn}</span>
              </div>
            )}
            {checkOut && (
              <div className="flex gap-2">
                <span className="font-semibold text-stone-800">Check-out:</span>
                <span>{checkOut}</span>
              </div>
            )}
          </div>
          {option.breakfast && (
            <div className="mt-2 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-2 py-1 text-xs font-bold text-white shadow">
                <Coffee className="h-3.5 w-3.5" />
                Breakfast
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Theme2HotelsPackage({
  packageLabel,
  nights,
}: {
  packageLabel: string;
  nights: HotelPackageNight[];
}) {
  if (!nights.length) return null;
  return (
    <section className="break-inside-avoid">
      <div className="mb-4 flex items-center justify-between border-b-2 border-green-900 pb-3">
        <h3 className="text-lg font-bold capitalize text-green-900 sm:text-xl md:text-2xl lg:text-3xl">
          <span>{packageLabel}</span>
        </h3>
      </div>
      <div className="mb-8 space-y-8 rounded-2xl border border-gray-300 bg-white p-6 shadow-lg">
        {nights.map((night) => (
          <div key={`${night.nightLabel}-${night.destination}`} className="mb-12">
            <div className="mb-6">
              <span className="rounded-full bg-green-900 px-3 py-1 text-lg font-bold text-white shadow-md">
                {night.nightLabel}{" "}
              </span>
              <br />
              <span className="mt-4 inline-flex flex-wrap gap-4 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-green-700">
                {"  "}
                {night.dateLabel}
              </span>
            </div>
            <h5 className="mb-4 text-xl font-bold text-gray-800">{night.destination}</h5>
            <div className="flex w-full flex-col items-center justify-center lg:flex-row lg:justify-evenly lg:gap-6">
              {night.options.map((option, index) => (
                <div key={`${option.hotelName}-${index}`} className="contents">
                  {index > 0 && (
                    <>
                      <div className="hidden text-xl font-bold text-green-900 lg:block">OR</div>
                      <div className="py-2 text-center text-xl font-bold text-green-900 lg:hidden">OR</div>
                    </>
                  )}
                  <Theme2HotelCard option={option} checkIn={night.checkIn} checkOut={night.checkOut} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Theme3HotelsPackage({
  packageLabel,
  nights,
}: {
  packageLabel: string;
  nights: HotelPackageNight[];
}) {
  if (!nights.length) return null;
  return (
    <section className="break-inside-avoid overflow-hidden">
      <h3 className="mb-6 text-2xl font-bold capitalize text-gray-900">{packageLabel}</h3>
      <div className="space-y-10">
        {nights.map((night) => (
          <div key={`${night.nightLabel}-${night.destination}`}>
            <div className="mb-3">
              <div className="inline-flex items-center rounded-full bg-red-900 px-3 py-1 font-bold text-white">
                <span>{night.nightLabel.replace(/-/g, " – ")} </span>
              </div>
              <br />
              <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-0 text-red-700">
                <span>{night.dateLabel}</span>
              </div>
            </div>
            <div className="space-y-6 rounded-xl border border-gray-300 bg-white p-5 shadow-sm">
              <div className="border-b pb-6 last:border-0 last:pb-0">
                <h5 className="mb-4 text-lg font-bold text-gray-800">{night.destination}</h5>
                <div className="flex w-full flex-col items-center justify-center gap-4 md:flex-row md:gap-4 lg:gap-6">
                  {night.options.map((option, index) => {
                    const master =
                      findHotelByOptionLabel(option.optionLabel) ??
                      findHotelByOptionLabel(option.hotelName);
                    const image =
                      option.imageUrl ||
                      master?.image_url ||
                      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80";
                    const rating = master?.rating || option.rating;
                    return (
                      <div key={`${option.hotelName}-${index}`} className="contents">
                        {index > 0 && (
                          <div className="text-xl font-bold text-red-900">OR</div>
                        )}
                        <div className="w-full md:w-1/2">
                          <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 transition hover:border-red-300 sm:flex-row">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={image}
                              alt={option.hotelName}
                              className="h-32 w-full rounded-lg object-cover shadow-md sm:h-28 sm:w-28"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-gray-900">{option.hotelName}</p>
                              <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                                <span className="text-yellow-500">★</span>
                                <span>{rating.toFixed(1)}</span>
                                <span>({option.reviewCount} Reviews)</span>
                              </div>
                              {option.breakfast && (
                                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-600 px-2 py-0.5 text-xs font-bold text-white">
                                  <Coffee className="h-3 w-3" />
                                  Breakfast
                                </span>
                              )}
                              <a
                                href={`https://www.google.com/search?q=${encodeURIComponent(option.hotelName + " hotel photos")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 block text-sm text-blue-600 underline"
                              >
                                View Photos
                              </a>
                              <div className="mt-2 space-y-0.5 text-sm text-gray-600">
                                {night.checkIn && (
                                  <p>
                                    <span className="font-semibold text-gray-800">Check-in:</span>{" "}
                                    {night.checkIn}
                                  </p>
                                )}
                                {night.checkOut && (
                                  <p>
                                    <span className="font-semibold text-gray-800">Check-out:</span>{" "}
                                    {night.checkOut}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function NightSegmentPills({ segments, accentSoft }: { segments: NightSegment[]; accentSoft: string }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {segments.map((segment) => (
        <div
          key={`${segment.nightLabel}-${segment.destination}`}
          className="min-w-[120px] rounded-xl border border-stone-200 px-3 py-2 text-center"
          style={{ backgroundColor: accentSoft }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-600">{segment.nightLabel}</p>
          <p className="text-xs text-stone-600">{segment.dateLabel}</p>
          <p className="mt-1 text-sm font-semibold text-stone-900">{segment.destination}</p>
        </div>
      ))}
    </div>
  );
}

function PackageOptionCard({
  optionNumber,
  label,
  packagePrice,
  grandTotal,
  segments,
  advancePercent = 20,
  theme,
}: {
  optionNumber: number;
  label: string;
  packagePrice: number;
  grandTotal: number;
  segments: NightSegment[];
  advancePercent?: 20 | 30;
  theme: PreviewTheme;
}) {
  const advance = bookingAmount(grandTotal, advancePercent / 100);
  return (
    <div
      className="break-inside-avoid rounded-2xl border bg-white p-5"
      style={{ borderColor: `${theme.accent}55` }}
    >
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.accent }}>
        Option {optionNumber}
      </p>
      <h3 className="mt-1 text-lg font-bold text-stone-900">{label}</h3>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-stone-100">
          <p className="text-[10px] uppercase text-stone-500">Base Price</p>
          <p className="font-bold tabular-nums text-stone-900">{formatInr(packagePrice)}</p>
        </div>
        <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-stone-100">
          <p className="text-[10px] uppercase text-stone-500">Total Price</p>
          <p className="font-bold tabular-nums" style={{ color: theme.heading }}>
            {formatInr(grandTotal)}
          </p>
        </div>
        <div className="rounded-lg bg-emerald-50 px-3 py-2 ring-1 ring-emerald-100">
          <p className="text-[10px] uppercase text-emerald-700">Booking Amount ({advancePercent}%)</p>
          <p className="font-bold tabular-nums text-emerald-900">{formatInr(advance)}</p>
        </div>
      </div>
      <NightSegmentPills segments={segments} accentSoft={theme.accentSoft} />
    </div>
  );
}

function dayImagesForCard(day: ItineraryDay, theme: PreviewTheme): string[] {
  const fromDay = (day.images ?? []).filter(Boolean);
  if (fromDay.length > 0) return fromDay;
  const start = (Math.max(1, day.day_number) - 1) % theme.gallery.length;
  return [0, 1, 2]
    .map((offset) => theme.gallery[(start + offset) % theme.gallery.length])
    .filter(Boolean) as string[];
}

function TimelineDayCard({
  day,
  travelDate,
  theme,
  isLast,
  layout,
  packageVehicles = [],
}: {
  day: ItineraryDay;
  travelDate: string | null;
  theme: PreviewTheme;
  isLast: boolean;
  layout: "theme2" | "theme3";
  packageVehicles?: string[];
}) {
  const dateLabel = travelDate
    ? formatDate(new Date(new Date(travelDate).setDate(new Date(travelDate).getDate() + day.day_number - 1)))
    : null;
  const images = dayImagesForCard(day, theme);
  const dayVehicle =
    day.vehicle_type?.trim() ||
    (layout === "theme3" ? packageVehicles[0] : undefined);

  if (layout === "theme3") {
    return (
      <div className="relative flex flex-col gap-4 sm:flex-row sm:gap-6">
        <div className="w-full shrink-0 text-left sm:w-28 sm:text-right">
          <p className="font-semibold text-red-900">Day {day.day_number}</p>
          {dateLabel && <p className="text-sm text-gray-600">{dateLabel}</p>}
        </div>
        <div className="relative hidden w-8 shrink-0 flex-col items-center self-stretch sm:flex sm:w-12">
          {!isLast && <div className="absolute bottom-0 top-4 w-0.5 bg-red-900" />}
          <div className="z-10 mt-1 h-4 w-4 rounded-full border-2 border-red-900 bg-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex w-full flex-wrap items-center gap-3">
            <span className="font-semibold text-gray-900">{day.day_title}</span>
            {dayVehicle && (
              <span className="inline-flex items-center gap-2 rounded-lg bg-red-900 px-2 py-1 text-xs capitalize text-white sm:text-sm">
                <Car className="h-4 w-4" />
                {dayVehicle}
              </span>
            )}
          </div>
          <QuotationDayCarousel
            images={images}
            alt={day.day_title}
            accent="#7F1D1D"
            className="mt-4 max-w-xl overflow-hidden rounded-lg"
            heightClassName="h-48 sm:h-60"
          />
          {day.day_description && (
            <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-gray-700 md:text-lg">
              {day.day_description}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-4 text-lg text-slate-600 sm:flex-row sm:gap-6">
      <div className="w-full shrink-0 text-left sm:w-24 sm:text-right">
        <p className="font-bold text-green-600">Day {day.day_number}</p>
        {dateLabel && <p className="text-sm text-gray-500">{dateLabel}</p>}
      </div>
      <div className="relative hidden w-8 shrink-0 flex-col items-center self-stretch sm:flex sm:w-12">
        {!isLast && <div className="absolute bottom-0 top-4 w-0.5 bg-green-500" />}
        <div className="z-10 mt-1 hidden h-4 w-4 rounded-full border-2 border-green-500 bg-white sm:flex" />
      </div>
      <div className="mt-4 w-full text-lg sm:mt-0 sm:w-1/4">
        <p className="font-bold text-gray-800">{day.day_title}</p>
        <QuotationDayCarousel
          images={images}
          alt={day.day_title}
          accent="#16A34A"
          className="mt-4 overflow-hidden rounded-lg"
          heightClassName="h-48 sm:h-60"
        />
      </div>
      <div className="mt-4 min-w-0 flex-1 sm:mt-6">
        {day.day_description && (
          <p className="whitespace-pre-wrap text-lg leading-relaxed text-slate-600">
            {day.day_description}
          </p>
        )}
      </div>
    </div>
  );
}

function DayCard({
  day,
  travelDate,
  theme,
}: {
  day: ItineraryDay;
  travelDate: string | null;
  theme: PreviewTheme;
}) {
  const dateLabel = travelDate
    ? formatDate(new Date(new Date(travelDate).setDate(new Date(travelDate).getDate() + day.day_number - 1)))
    : null;
  const image = dayGalleryImage(theme, day.day_number);
  const images = dayImagesForCard(day, theme);
  const isHeritageLayout = theme.id === 1;

  if (isHeritageLayout) {
    return (
      <div className="break-inside-avoid grid gap-4 border-b border-stone-100 py-5 sm:grid-cols-2">
        <div>
          <span
            className="inline-block rounded px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-white"
            style={{ backgroundColor: theme.heading }}
          >
            Day {day.day_number}
          </span>
          <h3 className="mt-2 text-base font-bold" style={{ color: theme.heading }}>
            {day.day_title}
          </h3>
          {dateLabel && <p className="mt-1 text-xs font-semibold uppercase text-stone-500">{dateLabel}</p>}
          {day.day_description && (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">{day.day_description}</p>
          )}
        </div>
        <div className="overflow-hidden rounded-xl">
          <QuotationDayCarousel
            images={images.length ? images : [image]}
            alt={day.day_title}
            accent={theme.accent}
          />
          <div
            className="px-3 py-1.5 text-center text-[10px] font-medium text-white"
            style={{ backgroundColor: theme.accent }}
          >
            Days Rajasthan Studio
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="break-inside-avoid overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="grid sm:grid-cols-[180px_1fr]">
        <QuotationDayCarousel
          images={images.length ? images : [image]}
          alt={day.day_title}
          accent={theme.accent}
          heightClassName="h-36 min-h-[144px] sm:h-full"
          className="rounded-none"
        />
        <div>
          <div
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-white"
            style={{ backgroundColor: theme.accent }}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-90">
                Day {day.day_number}
              </p>
              <h3 className="text-base font-bold">{day.day_title}</h3>
            </div>
            {dateLabel && <p className="text-sm font-medium">{dateLabel}</p>}
          </div>
          <div className="p-4">
            {day.day_subtitle && (
              <p className="text-sm font-medium" style={{ color: theme.accent }}>
                {day.day_subtitle}
              </p>
            )}
            {day.day_description && (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
                {day.day_description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {day.vehicle_type && (
                <span className="rounded-full bg-stone-50 px-2.5 py-1 text-stone-700 ring-1 ring-stone-200">
                  🚗 {day.vehicle_type}
                </span>
              )}
              {day.meal_plan && (
                <span className="rounded-full bg-stone-50 px-2.5 py-1 text-stone-700 ring-1 ring-stone-200">
                  Meals: {day.meal_plan}
                </span>
              )}
            </div>
            {(day.activities ?? []).length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-stone-100 pt-3 text-sm text-stone-700">
                {(day.activities ?? []).map((activity) => (
                  <li key={activity.activity_uuid}>
                    • {activity.title}
                    {activity.start_time ? ` (${activity.start_time})` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PolicyGrid({
  inclusions,
  exclusions,
  terms,
  accent,
}: {
  inclusions: string[];
  exclusions: string[];
  terms: string;
  accent: string;
}) {
  const policies = [
    { title: "Inclusions", items: inclusions, tone: "text-emerald-800" },
    { title: "Exclusions", items: exclusions, tone: "text-red-800" },
    { title: "Terms & Conditions", text: terms, tone: "text-stone-800" },
    { title: "Cancellation & Refund Policy", text: DEFAULT_CANCELLATION_POLICY, tone: "text-stone-800" },
    { title: "Payment Policy", text: DEFAULT_PAYMENT_POLICY, tone: "text-stone-800" },
  ];

  return (
    <section className="break-inside-avoid">
      <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: accent }}>
        Tour Policies
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {policies.map((policy) => (
          <div key={policy.title} className="rounded-xl border border-stone-200 bg-stone-50/50 p-4">
            <h3 className={`text-xs font-bold uppercase ${policy.tone}`}>{policy.title}</h3>
            {"items" in policy && policy.items ? (
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-stone-700">
                {policy.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{"text" in policy ? policy.text : ""}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function QuotationDocument({
  quoteId,
  versionNumber,
  revisionId,
  snapshot,
  brand,
  categoryTotals = [],
  mode = "screen",
  contacts = PREVIEW_CONTACTS,
  payment,
  structure = null,
}: {
  quoteId: string;
  versionNumber: number;
  revisionId: string;
  snapshot: ItinerarySnapshot;
  brand: ReportBrand;
  categoryTotals?: CategoryTotalSummary[];
  mode?: "screen" | "print";
  contacts?: PreviewContact[];
  payment?: PaymentDetails;
  structure?: CompanyStructure | null;
}) {
  const { header, client, days, terms, cost_sheet, category_pricing } = snapshot;
  const { inclusions, exclusions } = policyLinesFromSnapshot(snapshot);
  const inclusionItems = richPolicyItems(
    snapshot.inclusion_items,
    inclusions,
    DEFAULT_INCLUSION_ITEMS
  );
  const exclusionItems = richPolicyItems(
    snapshot.exclusion_items,
    exclusions,
    DEFAULT_EXCLUSION_ITEMS
  );
  const theme = getPreviewTheme(snapshot.preview_theme);
  const isLegacyTheme = theme.id === 1;
  const isTheme2 = theme.id === 2;
  const isTheme3 = theme.id === 3;
  const usesRichPolicies = isTheme2 || isTheme3;
  const usesTimelineDays = theme.id === 2 || theme.id === 3 || theme.id === 4 || theme.id === 5;
  const selectedContact = findSelectedContact(contacts, snapshot.selected_contact_id);
  // Cover uses company brand; agent appears in payment footer.
  const coverBrand: ReportBrand = {
    ...brand,
    companyName: brand.companyName || "Rajasthan Touring",
    phone: brand.phone || "+919351549292",
    email: brand.email || "rajasthantouringjaipur@gmail.com",
    address:
      brand.address ||
      "74, Deewan Nagar, Daulatpura Road, Khora Bisal, Benar Jaipur, Rajasthan India 302012",
    websiteUrl: brand.websiteUrl || "www.rajasthantouring.com",
  };
  const displayBrand = isLegacyTheme
    ? coverBrand
    : brandWithSelectedContact(coverBrand, selectedContact);
  const payDetails = payment ?? defaultPaymentDetailsFromSeed();
  const website =
    structure?.social_links?.website?.replace(/^https?:\/\//i, "") ||
    coverBrand.websiteUrl.replace(/^https?:\/\//i, "") ||
    "www.rajasthantouring.com";
  const clientLabel = [client.title, client.client_name].filter(Boolean).join(" ");
  const nightSegments = buildNightSegments(days, client.travel_date);
  const destinationsSummary = formatDestinationsSummary(nightSegments);
  const coveringDestinations = formatCoveringDestinations(nightSegments);
  const packageVehicles = resolvePackageVehicles(snapshot);
  const hotelPackageNights = buildHotelPackageNights(days, client.travel_date);
  const tierRows = tierRowsFromSnapshot(categoryTotals, category_pricing ?? []);
  const hasTiers = tierRows.length > 0;
  const advancePercent = snapshot.advance_percent === 30 ? 30 : 20;
  const advanceRate = advancePercent / 100;
  const primaryTier = tierRows[0];
  const primaryPackagePrice =
    primaryTier?.package_price ?? snapshot.final_price ?? cost_sheet.grand_total;
  const primaryGrandTotal = primaryTier?.grand_total ?? cost_sheet.grand_total;
  const primaryPackageLabel = primaryTier
    ? `${primaryTier.label} Package`
    : "Travel Package";

  const documentClassName = isTheme3
    ? "quotation-document quotation-theme-3 relative z-10 mx-auto max-w-7xl overflow-hidden bg-white p-0 text-stone-900"
    : mode === "print"
      ? `quotation-document quotation-theme-${theme.id} relative isolate mx-auto max-w-none p-0 text-stone-900`
      : isTheme2
        ? `quotation-document quotation-theme-${theme.id} relative isolate mx-auto max-w-7xl rounded-2xl border border-stone-200 text-stone-900 shadow-sm`
        : `quotation-document quotation-theme-${theme.id} relative isolate mx-auto max-w-4xl rounded-2xl border border-stone-200 text-stone-900 shadow-sm`;

  const documentStyle = {
    backgroundColor: isTheme3
      ? "#ffffff"
      : theme.id === 1
        ? "#ffffff"
        : theme.id === 5
          ? "#F8FAFC"
          : "#ffffff",
    WebkitPrintColorAdjust: "exact" as const,
    printColorAdjust: "exact" as const,
    ...(isTheme2
      ? { fontFamily: "var(--font-nunito)" as const }
      : isTheme3
        ? { fontFamily: "var(--font-poltawski)" as const }
        : {}),
  };

  const body = (
      <article
        className={documentClassName}
        style={documentStyle}
        data-theme={theme.id}
      >
      <QuotationThemeHero
        theme={theme}
        brand={displayBrand}
        clientLabel={clientLabel}
        client={client}
        header={header}
        destinationsSummary={destinationsSummary}
        coveringDestinations={coveringDestinations}
        packagePrice={isTheme2 || isTheme3 ? primaryPackagePrice : null}
        quoteId={quoteId}
        versionNumber={versionNumber}
      />

      {isLegacyTheme && <QuotationLegacyExploreBanner />}

      <div
        className={`relative z-[2] space-y-8 ${
          isLegacyTheme
            ? "px-4 py-6 sm:px-6"
            : isTheme3
              ? "px-4 py-8 sm:px-6 lg:px-8"
              : "px-6 py-8"
        }`}
      >
        {!isLegacyTheme && theme.id !== 2 && theme.id !== 3 && (
          <div className="grid gap-6 lg:grid-cols-2">
            <ClientDetailsTable
              clientLabel={clientLabel}
              client={client}
              header={header}
              accent={theme.accent}
            />

            <section className="break-inside-avoid rounded-2xl border border-stone-200 bg-white/80 p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: theme.accent }}>
                Travel Itinerary
              </h2>
              <p className="mt-2 text-sm text-stone-600">
                Covering Destinations:{" "}
                <span className="font-medium text-stone-900">{destinationsSummary}</span>
              </p>
              {header.tour_code && (
                <p className="mt-1 text-sm" style={{ color: theme.accent }}>
                  Tour Code:{" "}
                  <span className="font-semibold underline underline-offset-2">{header.tour_code}</span>
                </p>
              )}
              {!hasTiers && (
                <div
                  className="mt-4 rounded-xl border p-4"
                  style={{ borderColor: `${theme.accent}55`, backgroundColor: theme.accentSoft }}
                >
                  <p className="text-xs uppercase text-stone-500">Package Total</p>
                  <p className="text-2xl font-bold tabular-nums" style={{ color: theme.heading }}>
                    {formatInr(cost_sheet.grand_total)}
                  </p>
                  <p className="mt-1 text-sm text-emerald-800">
                    Booking Amount ({advancePercent}%):{" "}
                    <span className="font-bold">
                      {formatInr(bookingAmount(cost_sheet.grand_total, advanceRate))}
                    </span>
                  </p>
                </div>
              )}
              <div className="mt-4">
                <QuotationReviewWidgets layout="row" accentClassName="text-[#7B1E2E]" />
              </div>
            </section>
          </div>
        )}

        {isTheme2 && (
          <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 md:gap-6">
            <ClientDetailsTable
              clientLabel={clientLabel}
              client={client}
              header={header}
              accent={theme.accent}
              variant="theme2"
            />
            <Theme2PackagePriceCard
              label={primaryPackageLabel}
              packagePrice={primaryPackagePrice}
              grandTotal={primaryGrandTotal}
              advancePercent={advancePercent}
            />
          </div>
        )}

        {isTheme3 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <ClientDetailsTable
              clientLabel={clientLabel}
              client={client}
              header={header}
              accent={theme.accent}
              title="Your Information"
              variant="theme3"
            />
            <Theme3PackageSummaryCard
              label={primaryPackageLabel}
              packagePrice={primaryPackagePrice}
              grandTotal={primaryGrandTotal}
              advancePercent={advancePercent}
            />
          </div>
        )}

        <section>
          {!isLegacyTheme && !usesTimelineDays && (
            <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: theme.accent }}>
              Day-wise Itinerary
            </h2>
          )}
          {usesTimelineDays && (isTheme2 || isTheme3) && (
            <CoveringDestinationsRow
              covering={coveringDestinations}
              vehicles={isTheme2 ? packageVehicles : []}
              variant={isTheme3 ? "theme3" : "theme2"}
              accent={theme.accent}
            />
          )}
          {usesTimelineDays && !isTheme2 && !isTheme3 && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold" style={{ color: theme.accent }}>
                Travel Itinerary
              </h2>
              <p className="mt-1 text-sm text-stone-500">
                Covering Destinations • {destinationsSummary}
              </p>
              {header.tour_code && (
                <p className="mt-1 text-sm font-medium underline" style={{ color: theme.accent }}>
                  Tour Code: {header.tour_code}
                </p>
              )}
            </div>
          )}
          <div
            className={
              theme.id === 1
                ? "mt-2"
                : usesTimelineDays
                  ? "mt-2 space-y-8 sm:space-y-10"
                  : "mt-4 space-y-4"
            }
          >
            {days.map((day, index) =>
              usesTimelineDays ? (
                <TimelineDayCard
                  key={day.day_uuid}
                  day={day}
                  travelDate={client.travel_date}
                  theme={theme}
                  isLast={index === days.length - 1}
                  layout={theme.id === 3 ? "theme3" : "theme2"}
                  packageVehicles={packageVehicles}
                />
              ) : (
                <DayCard key={day.day_uuid} day={day} travelDate={client.travel_date} theme={theme} />
              )
            )}
          </div>
        </section>

        {isTheme2 && hotelPackageNights.some((n) => n.options.length > 0) && (
          <Theme2HotelsPackage
            packageLabel={primaryPackageLabel}
            nights={hotelPackageNights}
          />
        )}

        {isTheme3 && hotelPackageNights.some((n) => n.options.length > 0) && (
          <Theme3HotelsPackage
            packageLabel={primaryPackageLabel}
            nights={hotelPackageNights}
          />
        )}

        {hasTiers && !isTheme2 && !isTheme3 && (
          <section className="break-inside-avoid">
            <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: theme.accent }}>
              {tierRows.length === 1 ? "Travel Package Option" : "Travel Package Options"}
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              We&apos;ve curated exclusive travel packages for you. Choose the one that suits your journey best.
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {tierRows.map((tier, index) => (
                <PackageOptionCard
                  key={tier.category_key}
                  optionNumber={index + 1}
                  label={`${tier.label} Package`}
                  packagePrice={tier.package_price}
                  grandTotal={tier.grand_total}
                  segments={nightSegments}
                  advancePercent={advancePercent}
                  theme={theme}
                />
              ))}
            </div>
          </section>
        )}

        {/* Secondary tier (if Theme 2 has 2 categories): show second package price card above hotels already primary */}
        {isTheme2 && tierRows.length > 1 && (
          <section className="break-inside-avoid">
            <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: theme.accent }}>
              Additional Package Options
            </h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {tierRows.slice(1).map((tier, index) => (
                <PackageOptionCard
                  key={tier.category_key}
                  optionNumber={index + 2}
                  label={`${tier.label} Package`}
                  packagePrice={tier.package_price}
                  grandTotal={tier.grand_total}
                  segments={nightSegments}
                  advancePercent={advancePercent}
                  theme={theme}
                />
              ))}
            </div>
          </section>
        )}
        {usesRichPolicies ? (
          <Theme2TourPolicies
            inclusionItems={inclusionItems}
            exclusionItems={exclusionItems}
            variant={isTheme3 ? "theme3" : "theme2"}
            accent={theme.accent}
          />
        ) : (
          !isLegacyTheme && (
            <PolicyGrid
              inclusions={inclusions ?? []}
              exclusions={exclusions ?? []}
              terms={terms}
              accent={theme.accent}
            />
          )
        )}

        {!hasTiers && cost_sheet.line_items.length > 0 && !isLegacyTheme && !usesRichPolicies && (
          <section className="break-inside-avoid">
            <h2 className="text-sm font-bold uppercase text-stone-800">Pricing Summary</h2>
            <table className="mt-3 w-full text-sm">
              <tbody>
                {cost_sheet.line_items
                  .filter((line) => line.category !== "tax" && line.category !== "markup")
                  .slice(0, 12)
                  .map((line) => (
                    <tr key={line.id} className="border-b border-stone-100">
                      <td className="py-2 pr-4 text-stone-600">
                        {line.day_number ? `Day ${line.day_number} · ` : ""}
                        {line.description}
                      </td>
                      <td className="py-2 text-right tabular-nums">{formatInr(line.total)}</td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 font-bold" style={{ borderColor: `${theme.accent}66` }}>
                  <td className="pt-3">Grand total (incl. taxes)</td>
                  <td className="pt-3 text-right text-lg tabular-nums" style={{ color: theme.heading }}>
                    {formatInr(cost_sheet.grand_total)}
                  </td>
                </tr>
                <tr className="text-emerald-800">
                  <td className="pt-1 text-sm font-medium">Booking amount ({advancePercent}%)</td>
                  <td className="pt-1 text-right text-sm font-bold tabular-nums">
                    {formatInr(bookingAmount(cost_sheet.grand_total, advanceRate))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>
        )}

        {usesRichPolicies ? (
          <>
            <Theme2About
              structure={structure}
              brand={displayBrand}
              variant={isTheme3 ? "theme3" : "theme2"}
              accent={theme.accent}
            />
            <Theme2Contact
              brand={displayBrand}
              contact={selectedContact}
              structure={structure}
              variant={isTheme3 ? "theme3" : "theme2"}
              accent={theme.accent}
            />
            <p className="pt-4 text-center text-[10px] text-stone-400">
              This quotation is pinned to revision v{versionNumber} · {revisionId.slice(0, 8)}… · Theme{" "}
              {theme.id} {theme.styleName}
            </p>
          </>
        ) : (
          !isLegacyTheme && (
            <>
              <section
                className="break-inside-avoid rounded-2xl border p-5"
                style={{ borderColor: `${theme.accent}33`, backgroundColor: theme.accentSoft }}
              >
                <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: theme.accent }}>
                  About {brand.companyName}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-stone-700">
                  {brand.siteDescription ??
                    `${brand.companyName} crafts curated travel experiences with verified partners, transparent pricing, and dedicated on-ground support. Every itinerary is tailor-made to match your pace, preferences, and budget.`}
                </p>
              </section>

              <DocumentBrandFooter brand={displayBrand} />
              <p className="text-center text-[10px] text-stone-400">
                This quotation is pinned to revision v{versionNumber} · {revisionId.slice(0, 8)}… · Theme{" "}
                {theme.id} {theme.styleName}
              </p>
            </>
          )
        )}
      </div>

      {isLegacyTheme && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/theme-assets/legacy/banner-6.svg"
            alt=""
            className="block h-auto w-full object-cover md:object-contain"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/theme-assets/legacy/banner-0.svg"
            alt={coverBrand.companyName}
            className="block h-auto w-full object-cover"
          />
          <QuotationLegacyPolicies
            inclusions={inclusions ?? []}
            exclusions={exclusions ?? []}
            companyName={coverBrand.companyName || "Rajasthan Touring"}
          />
          <QuotationLegacyAbout structure={structure} brand={coverBrand} />
          <QuotationLegacyPaymentSection
            payment={payDetails}
            agent={selectedContact}
            website={website}
            brandLogo={structure?.logo_url || coverBrand.logoUrl}
          />
        </>
      )}
    </article>
  );

  if (!isTheme3) return body;

  return (
    <div
      className="relative w-full overflow-hidden bg-white text-stone-900"
      style={{
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      <Theme3SideRails />
      {body}
    </div>
  );
}
