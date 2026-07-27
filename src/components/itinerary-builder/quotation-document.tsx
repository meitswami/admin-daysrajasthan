import type { ReportBrand } from "@/lib/branding/report-brand";
import { formatInr } from "@/lib/itinerary-builder/cost-engine";
import {
  bookingAmount,
  buildNightSegments,
  DEFAULT_CANCELLATION_POLICY,
  DEFAULT_PAYMENT_POLICY,
  formatDestinationsSummary,
  getHotelStaysForTier,
  tierRowsFromSnapshot,
  type HotelStay,
  type NightSegment,
} from "@/lib/itinerary-builder/quotation-layout";
import {
  dayGalleryImage,
  getPreviewTheme,
  type PreviewTheme,
} from "@/lib/itinerary-builder/preview-themes";
import {
  PREVIEW_CONTACTS,
  contentBlocksToStrings,
  type PreviewContact,
} from "@/lib/itinerary-builder/policy-master";
import { findSelectedContact } from "@/lib/itinerary-builder/quotation-contacts";
import {
  defaultPaymentDetailsFromSeed,
  type PaymentDetails,
} from "@/lib/itinerary-builder/payment-details";
import type { CompanyStructure } from "@/types/company-structure";
import type { CategoryTotalSummary, ItineraryDay, ItinerarySnapshot } from "@/types/itinerary-builder";
import { formatDate } from "@/lib/utils";
import { DocumentBrandFooter } from "@/components/branding/document-brand";
import { QuotationThemeHero } from "@/components/itinerary-builder/quotation-theme-heroes";
import { QuotationDayCarousel } from "@/components/itinerary-builder/quotation-day-carousel";
import { QuotationReviewWidgets } from "@/components/itinerary-builder/quotation-review-widgets";
import {
  QuotationLegacyAbout,
  QuotationLegacyExploreBanner,
  QuotationLegacyPaymentSection,
  QuotationLegacyPolicies,
} from "@/components/itinerary-builder/quotation-legacy-sections";

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

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < full ? "text-amber-500" : i === full && half ? "text-amber-300" : "text-stone-300"}>
          ★
        </span>
      ))}
      <span className="ml-1 text-xs font-medium text-stone-600">{rating.toFixed(1)}</span>
    </span>
  );
}

function ClientDetailsTable({
  clientLabel,
  client,
  header,
  accent,
  title = "Client Details",
}: {
  clientLabel: string;
  client: ItinerarySnapshot["client"];
  header: ItinerarySnapshot["header"];
  accent: string;
  title?: string;
}) {
  const rows = [
    ["Name", clientLabel],
    ["Email", client.email],
    ["Phone", client.phone],
    ["Adults", String(client.adults)],
    ["Rooms", String(client.rooms)],
    ["Travel Date", client.travel_date ? formatDate(client.travel_date) : null],
  ].filter(([, value]) => value);

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

function HotelCard({ stay }: { stay: HotelStay }) {
  return (
    <div className="break-inside-avoid rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-stone-900">{stay.hotelName}</p>
          <p className="text-xs text-stone-500">{stay.destination}</p>
        </div>
        <StarRating rating={stay.rating} />
      </div>
      <p className="mt-1 text-[11px] text-stone-500">({stay.reviewCount.toLocaleString("en-IN")} reviews)</p>
      <div className="mt-3 grid gap-1 text-xs text-stone-600">
        {stay.checkIn && <p>Check-in: {stay.checkIn}</p>}
        {stay.checkOut && <p>Check-out: {stay.checkOut}</p>}
        <p className="font-medium text-emerald-700">
          {stay.roomCategory} · {stay.breakfast ? "Breakfast included" : "Room only"}
        </p>
      </div>
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
}: {
  day: ItineraryDay;
  travelDate: string | null;
  theme: PreviewTheme;
  isLast: boolean;
  layout: "theme2" | "theme3";
}) {
  const dateLabel = travelDate
    ? formatDate(new Date(new Date(travelDate).setDate(new Date(travelDate).getDate() + day.day_number - 1)))
    : null;
  const images = dayImagesForCard(day, theme);
  const accent = theme.accent;

  return (
    <div className="relative flex flex-col gap-4 sm:flex-row sm:gap-6">
      <div className="w-full shrink-0 text-left sm:w-24 sm:text-right">
        <p className="font-bold" style={{ color: accent }}>
          Day {day.day_number}
        </p>
        {dateLabel && <p className="text-sm text-stone-500">{dateLabel}</p>}
      </div>

      <div className="relative hidden w-10 shrink-0 flex-col items-center self-stretch sm:flex">
        {!isLast && (
          <div className="absolute bottom-0 top-4 w-0.5" style={{ backgroundColor: accent }} />
        )}
        <div
          className="z-10 mt-1 h-4 w-4 rounded-full border-2 bg-white"
          style={{ borderColor: accent }}
        />
      </div>

      {layout === "theme2" ? (
        <>
          <div className="w-full sm:w-1/4">
            <p className="text-lg font-bold text-stone-800">{day.day_title}</p>
            <QuotationDayCarousel
              images={images}
              alt={day.day_title}
              accent={accent}
              className="mt-4"
            />
          </div>
          <div className="min-w-0 flex-1">
            {day.day_description && (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700 sm:text-base">
                {day.day_description}
              </p>
            )}
            {day.hotel_name && (
              <p className="mt-3 text-xs font-medium" style={{ color: accent }}>
                🏨 {day.hotel_name}
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-stone-900">{day.day_title}</p>
          <QuotationDayCarousel
            images={images}
            alt={day.day_title}
            accent={accent}
            className="mt-4 max-w-xl"
          />
          {day.day_description && (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-stone-700 sm:text-base">
              {day.day_description}
            </p>
          )}
          {day.hotel_name && (
            <p className="mt-3 text-xs font-medium" style={{ color: accent }}>
              🏨 {day.hotel_name}
            </p>
          )}
        </div>
      )}
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
          {day.hotel_name && (
            <p className="mt-3 text-xs font-medium" style={{ color: theme.accent }}>
              🏨 {day.hotel_name}
            </p>
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
              {day.hotel_name && (
                <span
                  className="rounded-full px-2.5 py-1 font-medium ring-1"
                  style={{
                    backgroundColor: theme.accentSoft,
                    color: theme.heading,
                    borderColor: `${theme.accent}33`,
                  }}
                >
                  🏨 {day.hotel_name}
                </span>
              )}
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
  const theme = getPreviewTheme(snapshot.preview_theme);
  const isLegacyTheme = theme.id === 1;
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
  const tierRows = tierRowsFromSnapshot(categoryTotals, category_pricing ?? []);
  const hasTiers = tierRows.length > 0;
  const advancePercent = snapshot.advance_percent === 30 ? 30 : 20;
  const advanceRate = advancePercent / 100;

  return (
    <article
      className={`quotation-document quotation-theme-${theme.id} mx-auto text-stone-900 ${
        mode === "print" ? "max-w-none p-0" : "max-w-4xl rounded-2xl border border-stone-200 shadow-sm"
      }`}
      style={{
        backgroundColor:
          theme.id === 3 ? "#FBF7F0" : theme.id === 1 ? "#ffffff" : theme.id === 5 ? "#F8FAFC" : "#ffffff",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
      data-theme={theme.id}
    >
      <QuotationThemeHero
        theme={theme}
        brand={displayBrand}
        clientLabel={clientLabel}
        client={client}
        header={header}
        destinationsSummary={destinationsSummary}
        quoteId={quoteId}
        versionNumber={versionNumber}
        contactName={selectedContact?.name ?? null}
      />

      {isLegacyTheme && <QuotationLegacyExploreBanner />}

      <div className={`space-y-8 ${isLegacyTheme ? "px-4 py-6 sm:px-6" : "px-6 py-8"}`}>
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

        {(theme.id === 2 || theme.id === 3) && (
          <ClientDetailsTable
            clientLabel={clientLabel}
            client={client}
            header={header}
            accent={theme.accent}
            title={theme.id === 3 ? "Your Information" : "Client Details"}
          />
        )}

        {hasTiers && (
          <section className="break-inside-avoid">
            <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: theme.accent }}>
              Travel Package Options
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

        <section>
          {!isLegacyTheme && theme.id !== 2 && theme.id !== 3 && (
            <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: theme.accent }}>
              Day-wise Itinerary
            </h2>
          )}
          {(theme.id === 2 || theme.id === 3) && (
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
                : theme.id === 2 || theme.id === 3
                  ? "mt-2 space-y-8 sm:space-y-10"
                  : "mt-4 space-y-4"
            }
          >
            {days.map((day, index) =>
              theme.id === 2 || theme.id === 3 ? (
                <TimelineDayCard
                  key={day.day_uuid}
                  day={day}
                  travelDate={client.travel_date}
                  theme={theme}
                  isLast={index === days.length - 1}
                  layout={theme.id === 2 ? "theme2" : "theme3"}
                />
              ) : (
                <DayCard key={day.day_uuid} day={day} travelDate={client.travel_date} theme={theme} />
              )
            )}
          </div>
        </section>

        {hasTiers && (
          <section className="break-inside-avoid">
            <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: theme.accent }}>
              Hotels by Package
            </h2>
            <div className="mt-4 space-y-6">
              {tierRows.map((tier, index) => {
                const stays = getHotelStaysForTier(days, tier.room_category, client.travel_date);
                if (stays.length === 0) return null;
                return (
                  <div key={tier.category_key}>
                    <h3 className="text-sm font-semibold text-stone-900">
                      Option {index + 1}: {tier.label}
                    </h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {stays.map((stay) => (
                        <HotelCard key={`${tier.category_key}-${stay.hotelName}-${stay.checkIn}`} stay={stay} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {!isLegacyTheme && (
          <PolicyGrid
            inclusions={inclusions ?? []}
            exclusions={exclusions ?? []}
            terms={terms}
            accent={theme.accent}
          />
        )}

        {!hasTiers && cost_sheet.line_items.length > 0 && !isLegacyTheme && (
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

        {!isLegacyTheme && (
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
              This quotation is pinned to revision v{versionNumber} · {revisionId.slice(0, 8)}… · Theme {theme.id}{" "}
              {theme.styleName}
            </p>
          </>
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
}
