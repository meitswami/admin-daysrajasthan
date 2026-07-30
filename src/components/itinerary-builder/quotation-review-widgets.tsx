import {
  GOOGLE_REVIEWS_URL,
  REVIEW_STATS,
  TRIPADVISOR_REVIEWS_URL,
} from "@/lib/itinerary-builder/review-links";
import { cn } from "@/lib/utils";

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-400" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < full ? "text-amber-400" : "text-stone-300"}>
          ★
        </span>
      ))}
    </span>
  );
}

type Props = {
  /** stack = Theme 3 vertical; row = Theme 2 wrap */
  layout?: "stack" | "row";
  accentClassName?: string;
  className?: string;
  titleClassName?: string;
};

export function QuotationReviewWidgets({
  layout = "stack",
  accentClassName = "text-[#7B1E2E]",
  className,
  titleClassName,
}: Props) {
  const titleCls = titleClassName ?? "text-sm font-semibold text-stone-900 sm:text-base";
  return (
    <div
      className={cn(
        layout === "stack" ? "flex max-w-md flex-col gap-2.5" : "flex flex-wrap gap-3",
        className
      )}
    >
      <a
        href={GOOGLE_REVIEWS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-4 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm transition hover:border-stone-300 hover:shadow"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/theme-assets/reviews/google-g.webp"
          alt="Google"
          className="h-12 w-12 shrink-0 object-contain"
        />
        <div className="min-w-0">
          <p className={titleCls}>Customer Reviews</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1 text-yellow-500">
            <Stars rating={REVIEW_STATS.google.rating} />
            <span className="ml-1 text-xs text-gray-600">{REVIEW_STATS.google.rating}</span>
            <span className={cn("ml-1 text-xs text-gray-500", accentClassName)}>
              ({REVIEW_STATS.google.count.toLocaleString("en-IN")} {REVIEW_STATS.google.label})
            </span>
          </div>
        </div>
      </a>

      <a
        href={TRIPADVISOR_REVIEWS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-4 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm transition hover:border-stone-300 hover:shadow"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/theme-assets/reviews/tripadvisor.png"
          alt="TripAdvisor"
          className="h-12 w-12 shrink-0 rounded-full object-contain p-1"
        />
        <div className="min-w-0">
          <p className={titleCls}>TripAdvisor Review</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1 text-yellow-500">
            <Stars rating={REVIEW_STATS.tripadvisor.rating} />
            <span className="ml-1 text-xs text-gray-600">{REVIEW_STATS.tripadvisor.rating}</span>
            <span className={cn("ml-1 text-xs text-gray-500", accentClassName)}>
              ({REVIEW_STATS.tripadvisor.count.toLocaleString("en-IN")} {REVIEW_STATS.tripadvisor.label})
            </span>
          </div>
        </div>
      </a>
    </div>
  );
}
