/** Client contact field helpers for itinerary builder forms. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Keep digits only, max 10 (Indian mobile style). */
export function sanitizePhoneDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 10);
}

export function phoneValidationError(phone: string | null | undefined): string | null {
  const v = phone?.trim() ?? "";
  if (!v) return "Phone number is required";
  if (!/^\d{10}$/.test(v)) return "Phone number must be exactly 10 digits";
  return null;
}

export function emailValidationError(
  email: string | null | undefined,
  opts?: { required?: boolean; label?: string },
): string | null {
  const label = opts?.label ?? "email";
  const v = email?.trim() ?? "";
  if (!v) return opts?.required ? `${label.charAt(0).toUpperCase()}${label.slice(1)} is required` : null;
  if (!EMAIL_RE.test(v)) return `Enter a valid ${label} address`;
  return null;
}
