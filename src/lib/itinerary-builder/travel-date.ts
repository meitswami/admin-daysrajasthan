/** Local calendar date as `YYYY-MM-DD` for `<input type="date">` min/value. */
export function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Travel date must be today or a future day (local calendar). */
export function isTravelDateNotPast(date: string | null | undefined): boolean {
  const v = date?.trim() ?? "";
  if (!v) return false;
  return v >= todayIsoDate();
}

export function travelDateValidationError(date: string | null | undefined): string | null {
  const v = date?.trim() ?? "";
  if (!v) return "Travel date is required";
  if (v < todayIsoDate()) return "Travel date cannot be earlier than today";
  return null;
}
