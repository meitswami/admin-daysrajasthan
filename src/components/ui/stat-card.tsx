import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type StatCardTone = "blue" | "amber" | "green" | "purple" | "red" | "orange" | "sky";

const TONE_STYLES: Record<StatCardTone, { box: string; icon: string; glow: string }> = {
  blue: {
    box: "bg-sky-50 text-sky-600",
    icon: "text-sky-600",
    glow: "bg-sky-500/10",
  },
  sky: {
    box: "bg-sky-50 text-sky-600",
    icon: "text-sky-600",
    glow: "bg-sky-500/10",
  },
  amber: {
    box: "bg-amber-50 text-amber-600",
    icon: "text-amber-600",
    glow: "bg-amber-500/10",
  },
  orange: {
    box: "bg-orange-50 text-orange-600",
    icon: "text-orange-600",
    glow: "bg-orange-500/10",
  },
  green: {
    box: "bg-emerald-50 text-emerald-600",
    icon: "text-emerald-600",
    glow: "bg-emerald-500/10",
  },
  purple: {
    box: "bg-violet-50 text-violet-600",
    icon: "text-violet-600",
    glow: "bg-violet-500/10",
  },
  red: {
    box: "bg-rose-50 text-rose-600",
    icon: "text-rose-600",
    glow: "bg-rose-500/10",
  },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  tone = "amber",
  glow = false,
  className,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  trend?: string;
  /** Colored icon badge — Image 1 multi-tone cards */
  tone?: StatCardTone;
  /** Soft circular corner glow — Image 3 section cards */
  glow?: boolean;
  className?: string;
}) {
  const styles = TONE_STYLES[tone];

  return (
    <div
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5",
        className
      )}
    >
      {glow && (
        <div
          className={cn(
            "absolute -right-5 -top-5 h-24 w-24 rounded-full transition-transform group-hover:scale-110",
            styles.glow
          )}
        />
      )}
      <div className="relative flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <p className="line-clamp-2 flex-1 text-xs font-medium leading-snug text-stone-500 sm:text-sm">
            {label}
          </p>
          <div
            className={cn(
              "relative z-[1] flex h-10 w-10 shrink-0 items-center justify-center sm:h-11 sm:w-11",
              glow ? cn("rounded-full", styles.glow) : cn("rounded-xl", styles.box)
            )}
          >
            <Icon className={cn("h-5 w-5", glow && styles.icon)} />
          </div>
        </div>
        <p className="mt-3 text-2xl font-bold tabular-nums leading-none text-stone-900 sm:mt-4 sm:text-3xl">
          {value}
        </p>
        {trend ? (
          <p className="mt-2 text-xs font-medium leading-none text-emerald-600">{trend}</p>
        ) : null}
      </div>
    </div>
  );
}
