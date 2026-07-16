export type DashboardPeriod = "today" | "week" | "month" | "all" | "custom";

export type DateRangeBounds = {
  start: Date | null;
  end: Date | null;
};

export function getPeriodBounds(
  period: DashboardPeriod,
  custom?: { from?: string; to?: string },
  now = new Date()
): DateRangeBounds {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (period === "all") {
    return { start: null, end: null };
  }

  if (period === "custom") {
    const start = custom?.from ? new Date(custom.from) : null;
    const customEnd = custom?.to ? new Date(custom.to) : end;
    if (start && !Number.isNaN(start.getTime())) start.setHours(0, 0, 0, 0);
    if (customEnd && !Number.isNaN(customEnd.getTime())) customEnd.setHours(23, 59, 59, 999);
    return {
      start: start && !Number.isNaN(start.getTime()) ? start : null,
      end: customEnd && !Number.isNaN(customEnd.getTime()) ? customEnd : end,
    };
  }

  if (period === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  if (period === "week") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    return { start, end };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

export function isInDashboardPeriod(
  iso: string,
  period: DashboardPeriod,
  now = new Date(),
  custom?: { from?: string; to?: string }
): boolean {
  if (period === "all") return true;

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;

  const { start, end } = getPeriodBounds(period, custom, now);
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

export function periodLabel(
  period: DashboardPeriod,
  custom?: { from?: string; to?: string }
): string {
  switch (period) {
    case "today":
      return "Today";
    case "week":
      return "This week";
    case "month":
      return "This month";
    case "all":
      return "All time";
    case "custom":
      return custom?.from && custom?.to
        ? `${custom.from} → ${custom.to}`
        : "Custom range";
  }
}
