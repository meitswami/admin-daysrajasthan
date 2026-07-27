import type { PreviewContact } from "@/lib/itinerary-builder/policy-master";
import { PREVIEW_CONTACTS } from "@/lib/itinerary-builder/policy-master";
import type { CompanyStructure, StaffContact } from "@/types/company-structure";

/** Stable ids aligned with Structure defaults / preview seed. */
export const STRUCTURE_CONTACT_SEED_IDS = [
  "ct-vandana",
  "ct-shatrughan",
  "ct-hemendra",
  "ct-priya",
  "ct-soniya",
  "ct-pooja",
] as const;

function slugContactId(name: string, fallbackIndex: number): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug ? `ct-${slug}` : `ct-contact-${fallbackIndex + 1}`;
}

export function staffToPreviewContact(staff: StaffContact, index = 0): PreviewContact {
  const phone = staff.mobiles.split(/[,|/]/)[0]?.trim() || staff.mobiles.trim();
  const email = staff.emails.split(/[,|/]/)[0]?.trim() || staff.emails.trim();
  return {
    id: staff.id || slugContactId(staff.name, index),
    name: staff.name.trim(),
    phone,
    email,
  };
}

/** Prefer Dynamic Structure staff; fall back to hardcoded preview list. */
export function contactsFromStructure(
  structure: CompanyStructure | null | undefined
): PreviewContact[] {
  const staff = structure?.staff_contacts?.filter((c) => c.name.trim()) ?? [];
  if (staff.length === 0) return PREVIEW_CONTACTS;
  return staff.map((c, i) => staffToPreviewContact(c, i));
}

export function findSelectedContact(
  contacts: PreviewContact[],
  contactId: string | null | undefined
): PreviewContact | null {
  if (!contactId) return null;
  const direct = contacts.find((c) => c.id === contactId);
  if (direct) return direct;
  // Legacy id / name fallback when Structure regenerated uuids
  const legacy = PREVIEW_CONTACTS.find((c) => c.id === contactId);
  if (legacy) {
    return (
      contacts.find(
        (c) =>
          c.name.toLowerCase() === legacy.name.toLowerCase() ||
          c.phone.replace(/\D/g, "") === legacy.phone.replace(/\D/g, "")
      ) ?? legacy
    );
  }
  return null;
}

export function formatStructureAddress(structure: CompanyStructure | null | undefined): string {
  const a = structure?.addresses?.[0];
  if (!a) {
    return "74, Deewan Nagar, Daulatpura Road, Khora Bisal, Benar Jaipur, Rajasthan India 302012";
  }
  return [a.street, a.area, a.city, a.state, a.pincode].filter(Boolean).join(", ");
}

export function structureWebsite(structure: CompanyStructure | null | undefined): string {
  const raw = structure?.social_links?.website?.trim() || "www.rajasthantouring.com";
  return raw.replace(/^https?:\/\//i, "");
}

export function structureSupportPhone(structure: CompanyStructure | null | undefined): string {
  return structure?.support_number?.trim() || "+919351549292";
}
