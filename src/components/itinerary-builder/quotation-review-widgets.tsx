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
};

export function QuotationReviewWidgets({
  layout = "stack",
  accentClassName = "text-[#7B1E2E]",
  className,
}: Props) {
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
        className="inline-flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2.5 shadow-sm transition hover:border-stone-300 hover:shadow"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/theme-assets/reviews/google-g.webp"
          alt="Google"
          className="h-11 w-11 shrink-0 object-contain"
        />
        <div className="min-w-0">
          <p className="font-serif text-sm font-semibold text-stone-900 sm:text-base">
            Customer Reviews
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm">
            <Stars rating={REVIEW_STATS.google.rating} />
            <span className="font-semibold text-stone-800">{REVIEW_STATS.google.rating}</span>
            <span className={cn("text-xs font-medium sm:text-sm", accentClassName)}>
              {REVIEW_STATS.google.count.toLocaleString("en-IN")} {REVIEW_STATS.google.label}
            </span>
          </div>
        </div>
      </a>

      <a
        href={TRIPADVISOR_REVIEWS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2.5 shadow-sm transition hover:border-stone-300 hover:shadow"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/theme-assets/reviews/tripadvisor.png"
          alt="TripAdvisor"
          className="h-11 w-11 shrink-0 rounded-full object-contain"
        />
        <div className="min-w-0">
          <p className="font-serif text-sm font-semibold text-stone-900 sm:text-base">
            TripAdvisor Review
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm">
            <Stars rating={REVIEW_STATS.tripadvisor.rating} />
            <span className="font-semibold text-stone-800">{REVIEW_STATS.tripadvisor.rating}</span>
            <span className={cn("text-xs font-medium sm:text-sm", accentClassName)}>
              {REVIEW_STATS.tripadvisor.count.toLocaleString("en-IN")} {REVIEW_STATS.tripadvisor.label}
            </span>
          </div>
        </div>
      </a>
    </div>
  );
}
