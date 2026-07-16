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
import type { CategoryTotalSummary, ItineraryDay, ItinerarySnapshot } from "@/types/itinerary-builder";
import { formatDate } from "@/lib/utils";
import { DocumentBrandFooter } from "@/components/branding/document-brand";

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
}: {
  clientLabel: string;
  client: ItinerarySnapshot["client"];
  header: ItinerarySnapshot["header"];
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
      <h2 className="text-sm font-bold uppercase tracking-wide text-amber-800">Client Details</h2>
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
          Tour Code: <span className="font-semibold text-amber-900">{header.tour_code}</span>
        </p>
      )}
    </section>
  );
}

function NightSegmentPills({ segments }: { segments: NightSegment[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {segments.map((segment) => (
        <div
          key={`${segment.nightLabel}-${segment.destination}`}
          className="min-w-[120px] rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2 text-center"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">{segment.nightLabel}</p>
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
}: {
  optionNumber: number;
  label: string;
  packagePrice: number;
  grandTotal: number;
  segments: NightSegment[];
}) {
  const advance = bookingAmount(grandTotal);
  return (
    <div className="break-inside-avoid rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50/80 to-white p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Option {optionNumber}</p>
      <h3 className="mt-1 text-lg font-bold text-stone-900">{label}</h3>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-stone-100">
          <p className="text-[10px] uppercase text-stone-500">Base Price</p>
          <p className="font-bold tabular-nums text-stone-900">{formatInr(packagePrice)}</p>
        </div>
        <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-stone-100">
          <p className="text-[10px] uppercase text-stone-500">Total Price</p>
          <p className="font-bold tabular-nums text-amber-900">{formatInr(grandTotal)}</p>
        </div>
        <div className="rounded-lg bg-emerald-50 px-3 py-2 ring-1 ring-emerald-100">
          <p className="text-[10px] uppercase text-emerald-700">Booking Amount (20%)</p>
          <p className="font-bold tabular-nums text-emerald-900">{formatInr(advance)}</p>
        </div>
      </div>
      <NightSegmentPills segments={segments} />
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
        <p className="font-medium text-emerald-700">{stay.roomCategory} · {stay.breakfast ? "Breakfast included" : "Room only"}</p>
      </div>
    </div>
  );
}

function DayCard({ day, travelDate }: { day: ItineraryDay; travelDate: string | null }) {
  const dateLabel = travelDate
    ? formatDate(new Date(new Date(travelDate).setDate(new Date(travelDate).getDate() + day.day_number - 1)))
    : null;

  return (
    <div className="break-inside-avoid overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-amber-700 to-amber-600 px-4 py-3 text-white">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-90">Day {day.day_number}</p>
          <h3 className="text-base font-bold">{day.day_title}</h3>
        </div>
        {dateLabel && <p className="text-sm font-medium">{dateLabel}</p>}
      </div>
      <div className="p-4">
        {day.day_subtitle && <p className="text-sm font-medium text-amber-800">{day.day_subtitle}</p>}
        {day.day_description && (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">{day.day_description}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {day.hotel_name && (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-900 ring-1 ring-amber-100">
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
  );
}

function PolicyGrid({
  inclusions,
  exclusions,
  terms,
}: {
  inclusions: string[];
  exclusions: string[];
  terms: string;
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
      <h2 className="text-sm font-bold uppercase tracking-wide text-amber-800">Tour Policies</h2>
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
}: {
  quoteId: string;
  versionNumber: number;
  revisionId: string;
  snapshot: ItinerarySnapshot;
  brand: ReportBrand;
  categoryTotals?: CategoryTotalSummary[];
  mode?: "screen" | "print";
}) {
  const { header, client, days, inclusions, exclusions, terms, cost_sheet, category_pricing } = snapshot;
  const clientLabel = [client.title, client.client_name].filter(Boolean).join(" ");
  const nightSegments = buildNightSegments(days, client.travel_date);
  const destinationsSummary = formatDestinationsSummary(nightSegments);
  const tierRows = tierRowsFromSnapshot(categoryTotals, category_pricing ?? []);
  const hasTiers = tierRows.length > 0;

  return (
    <article
      className={`quotation-document mx-auto bg-white text-stone-900 ${
        mode === "print" ? "max-w-none p-0" : "max-w-4xl rounded-2xl border border-stone-200 shadow-sm"
      }`}
    >
      {/* Top contact bar */}
      <div className="border-b border-amber-100 bg-amber-50/50 px-6 py-2 text-right text-xs font-medium text-amber-900">
        {brand.phone}
      </div>

      {/* Cover hero */}
      <section className="bg-gradient-to-br from-amber-800 via-amber-700 to-amber-900 px-6 py-8 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.logoUrl}
                alt={brand.companyName}
                className="h-12 max-w-[160px] rounded-lg bg-white/10 object-contain object-left p-1 print:h-10"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-sm font-bold">
                {brand.shortName.slice(0, 3)}
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-100">{brand.companyName}</p>
              <p className="text-[11px] text-amber-200">{brand.email}</p>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="font-bold">{quoteId}</p>
            <p className="text-amber-200">Version {versionNumber}</p>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-sm text-amber-100">
            Hi {client.client_name || "there"},
          </p>
          <p className="mt-1 text-base text-amber-50">
            Here is the package exclusively designed / tailor-made for you
          </p>
          {header.duration_label && (
            <p className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">{header.duration_label}</p>
          )}
          <h1 className="mt-2 text-xl font-bold uppercase leading-tight sm:text-2xl">{header.title}</h1>
          {destinationsSummary && (
            <p className="mt-3 text-sm text-amber-100">• {destinationsSummary.replace(/ • /g, " • ")}</p>
          )}
        </div>
      </section>

      <div className="space-y-8 px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <ClientDetailsTable clientLabel={clientLabel} client={client} header={header} />

          <section className="break-inside-avoid rounded-2xl border border-stone-200 bg-stone-50/40 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-amber-800">Travel Itinerary</h2>
            <p className="mt-2 text-sm text-stone-600">
              Covering Destinations: <span className="font-medium text-stone-900">{destinationsSummary}</span>
            </p>
            {!hasTiers && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <p className="text-xs uppercase text-stone-500">Package Total</p>
                <p className="text-2xl font-bold tabular-nums text-amber-900">{formatInr(cost_sheet.grand_total)}</p>
                <p className="mt-1 text-sm text-emerald-800">
                  Booking Amount (20%): <span className="font-bold">{formatInr(bookingAmount(cost_sheet.grand_total))}</span>
                </p>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-stone-500">
              <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-stone-200">
                ★ ★ ★ ★ ★ 4.8 TripAdvisor
              </span>
              <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-stone-200">
                ★ ★ ★ ★ ★ 4.8 Google Reviews
              </span>
            </div>
          </section>
        </div>

        {hasTiers && (
          <section className="break-inside-avoid">
            <h2 className="text-sm font-bold uppercase tracking-wide text-amber-800">Travel Package Options</h2>
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
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-amber-800">Day-wise Itinerary</h2>
          <div className="mt-4 space-y-4">
            {days.map((day) => (
              <DayCard key={day.day_uuid} day={day} travelDate={client.travel_date} />
            ))}
          </div>
        </section>

        {hasTiers && (
          <section className="break-inside-avoid">
            <h2 className="text-sm font-bold uppercase tracking-wide text-amber-800">Hotels by Package</h2>
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

        <PolicyGrid inclusions={inclusions ?? []} exclusions={exclusions ?? []} terms={terms} />

        {!hasTiers && cost_sheet.line_items.length > 0 && (
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
                <tr className="border-t-2 border-amber-200 font-bold">
                  <td className="pt-3">Grand total (incl. taxes)</td>
                  <td className="pt-3 text-right text-lg tabular-nums text-amber-900">
                    {formatInr(cost_sheet.grand_total)}
                  </td>
                </tr>
                <tr className="text-emerald-800">
                  <td className="pt-1 text-sm font-medium">Booking amount (20%)</td>
                  <td className="pt-1 text-right text-sm font-bold tabular-nums">
                    {formatInr(bookingAmount(cost_sheet.grand_total))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>
        )}

        <section className="break-inside-avoid rounded-2xl border border-amber-100 bg-amber-50/30 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-amber-800">About {brand.companyName}</h2>
          <p className="mt-3 text-sm leading-relaxed text-stone-700">
            {brand.siteDescription ??
              `${brand.companyName} crafts curated travel experiences with verified partners, transparent pricing, and dedicated on-ground support. Every itinerary is tailor-made to match your pace, preferences, and budget.`}
          </p>
        </section>

        <DocumentBrandFooter brand={brand} />
        <p className="text-center text-[10px] text-stone-400">
          This quotation is pinned to revision v{versionNumber} · {revisionId.slice(0, 8)}…
        </p>
      </div>
    </article>
  );
}
