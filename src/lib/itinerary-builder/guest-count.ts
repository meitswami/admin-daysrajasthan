/** Guest / room counts: empty, or integer 0–1000 with no leading zeros. */

export const GUEST_COUNT_MAX = 1000;

/**
 * Parse a count field from user input.
 * Accepts "" → null, "0" → 0, "1"…"1000" → number.
 * Rejects leading zeros ("02", "012"), decimals, and out-of-range values.
 * Returns `undefined` when the raw string is invalid (caller should ignore the keystroke).
 */
export function parseGuestCount(raw: string): number | null | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (!/^(0|[1-9]\d{0,3})$/.test(trimmed)) return undefined;
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 0 || n > GUEST_COUNT_MAX) return undefined;
  return n;
}

export function guestCountInputValue(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}
