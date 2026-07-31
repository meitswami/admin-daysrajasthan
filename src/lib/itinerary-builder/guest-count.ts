/** Guest / room counts: empty, or integer 0–100 with no leading zeros. */

export const GUEST_COUNT_MAX = 100;

/**
 * Parse a count field from user input.
 * Accepts "" → null, "0" → 0, "1"…"100" → number.
 * Rejects leading zeros ("02", "012"), decimals, and out-of-range values.
 * Returns `undefined` when the raw string is invalid (caller should ignore the keystroke).
 */
export function parseGuestCount(raw: string): number | null | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (!/^(0|[1-9]\d{0,2})$/.test(trimmed)) return undefined;
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 0 || n > GUEST_COUNT_MAX) return undefined;
  return n;
}

export function guestCountInputValue(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}
