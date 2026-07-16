import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  className,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  trend?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative flex h-full min-h-[132px] flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:min-h-[140px] sm:p-5",
        className
      )}
    >
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-500/5 transition-transform group-hover:scale-110" />
      <div className="relative flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <p className="line-clamp-2 min-h-[2.5rem] flex-1 text-xs font-medium leading-snug text-stone-500 sm:min-h-[2.75rem] sm:text-sm">
            {label}
          </p>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 sm:h-11 sm:w-11">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold tabular-nums leading-none text-stone-900 sm:mt-3 sm:text-3xl">
          {value}
        </p>
        <p className={cn("mt-2 min-h-[1rem] text-xs leading-none", trend ? "text-emerald-600" : "invisible")}>
          {trend ?? "—"}
        </p>
      </div>
    </div>
  );
}
