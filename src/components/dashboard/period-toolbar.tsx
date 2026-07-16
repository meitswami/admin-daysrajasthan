"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { periodLabel, type DashboardPeriod } from "@/lib/utils/date-range";
import { Download } from "lucide-react";

const PERIODS: { id: DashboardPeriod; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "all", label: "All" },
  { id: "custom", label: "Custom" },
];

export function DashboardPeriodToolbar({
  period,
  onPeriodChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  onExport,
  exportLabel = "Export CSV",
}: {
  period: DashboardPeriod;
  onPeriodChange: (p: DashboardPeriod) => void;
  customFrom?: string;
  customTo?: string;
  onCustomFromChange?: (v: string) => void;
  onCustomToChange?: (v: string) => void;
  onExport?: () => void;
  exportLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-sm font-medium text-stone-600">Period</p>
      <div className="inline-flex flex-wrap rounded-xl border border-stone-200 bg-white p-1 shadow-sm">
        {PERIODS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onPeriodChange(item.id)}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm",
              period === item.id
                ? "bg-amber-500 text-white shadow-sm"
                : "text-stone-600 hover:bg-stone-50"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {period === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            className="h-9 w-auto"
            value={customFrom ?? ""}
            onChange={(e) => onCustomFromChange?.(e.target.value)}
          />
          <span className="text-xs text-stone-400">to</span>
          <Input
            type="date"
            className="h-9 w-auto"
            value={customTo ?? ""}
            onChange={(e) => onCustomToChange?.(e.target.value)}
          />
        </div>
      )}

      {onExport && (
        <Button type="button" size="sm" variant="outline" onClick={onExport}>
          <Download className="h-4 w-4" />
          {exportLabel}
        </Button>
      )}

      <span className="text-xs text-stone-400">{periodLabel(period, { from: customFrom, to: customTo })}</span>
    </div>
  );
}
