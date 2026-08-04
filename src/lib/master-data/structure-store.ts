import type { TeamMember } from "@/types/rbac";
import type {
  BankAccount,
  CompanyAchievement,
  CompanyAddress,
  CompanyStructure,
  PaymentMethod,
  SocialLinks,
  StaffContact,
} from "@/types/company-structure";
import { requireCloudMaster, useCloudMaster } from "@/lib/master-data/cloud";
import { logMasterDataChange } from "@/lib/master-data/audit";
import { ensureStoredImageUrls } from "@/lib/supabase/storage-upload";

const ROW_ID = "default";

function uid(): string {
  return crypto.randomUUID();
}

/** Empty shell for first-time / missing cloud row — never invents contacts or bank details. */
export function emptyCompanyStructure(): CompanyStructure {
  return {
    logo_url: null,
    staff_contacts: [],
    addresses: [],
    social_links: { facebook: "", instagram: "", youtube: "", website: "" },
    support_number: "",
    bank_accounts: [],
    payment_methods: [],
    achievements: [],
    updated_at: new Date().toISOString(),
  };
}

/**
 * @deprecated Do not use for UI data. Kept only for rare offline tooling.
 * Prefer getCompanyStructure() (database) or emptyCompanyStructure().
 */
export function defaultCompanyStructure(): CompanyStructure {
  return emptyCompanyStructure();
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function mapRow(row: Record<string, unknown>): CompanyStructure {
  const social = (row.social_links as SocialLinks | null) ?? {
    facebook: "",
    instagram: "",
    youtube: "",
    website: "",
  };
  const achievementsRaw = asArray<CompanyAchievement>(row.achievements);
  return {
    logo_url: (row.logo_url as string | null) ?? null,
    staff_contacts: asArray<StaffContact>(row.staff_contacts).map((c) => ({
      id: c.id || uid(),
      name: c.name ?? "",
      emails: c.emails ?? "",
      mobiles: c.mobiles ?? "",
    })),
    addresses: asArray<CompanyAddress>(row.addresses).map((a) => ({
      id: a.id || uid(),
      street: a.street ?? "",
      area: a.area ?? "",
      city: a.city ?? "",
      state: a.state ?? "",
      pincode: a.pincode ?? "",
      landmark: a.landmark ?? "",
    })),
    social_links: {
      facebook: social.facebook ?? "",
      instagram: social.instagram ?? "",
      youtube: social.youtube ?? "",
      website: social.website ?? "",
    },
    support_number: String(row.support_number ?? ""),
    bank_accounts: asArray<BankAccount>(row.bank_accounts).map((b) => ({
      id: b.id || uid(),
      bank_name: b.bank_name ?? "",
      ifsc_code: b.ifsc_code ?? "",
      account_name: b.account_name ?? "",
      account_number: b.account_number ?? "",
      account_type: b.account_type ?? "",
    })),
    payment_methods: asArray<PaymentMethod>(row.payment_methods).map((p) => ({
      id: p.id || uid(),
      type: p.type ?? "UPI",
      upi_id: p.upi_id ?? "",
      receiver_name: p.receiver_name ?? "",
      mobile_number: p.mobile_number ?? "",
      qr_image_url: p.qr_image_url ?? null,
    })),
    achievements: achievementsRaw.map((a) => ({
      id: a.id || uid(),
      name: a.name ?? "",
      description: a.description ?? "",
      image_urls: Array.isArray(a.image_urls) ? a.image_urls.filter(Boolean) : [],
    })),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

/**
 * Company structure — Supabase only.
 * Never reads or writes localStorage / cookies. Never seeds dummy contacts.
 */
export async function getCompanyStructure(): Promise<CompanyStructure> {
  if (!useCloudMaster()) {
    throw new Error(
      "Supabase is not configured. Structure requires a live database (no browser storage)."
    );
  }
  requireCloudMaster();
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { data, error } = await supabase
    .from("td_company_structure")
    .select("*")
    .eq("id", ROW_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return mapRow(data as Record<string, unknown>);
  return emptyCompanyStructure();
}

export async function saveCompanyStructure(
  draft: CompanyStructure,
  actor?: TeamMember
): Promise<CompanyStructure> {
  requireCloudMaster();
  const before = await getCompanyStructure();

  const [logoResolved] = draft.logo_url
    ? await ensureStoredImageUrls([draft.logo_url], "structure")
    : [null];

  const paymentMethods: PaymentMethod[] = [];
  for (const pm of draft.payment_methods) {
    const [qr] = pm.qr_image_url
      ? await ensureStoredImageUrls([pm.qr_image_url], "structure")
      : [null];
    paymentMethods.push({
      ...pm,
      qr_image_url: qr,
    });
  }

  const achievements: CompanyAchievement[] = [];
  for (const a of draft.achievements) {
    const images = a.image_urls?.length
      ? await ensureStoredImageUrls(a.image_urls, "structure")
      : [];
    achievements.push({
      ...a,
      image_urls: images,
    });
  }

  const next: CompanyStructure = {
    ...draft,
    logo_url: logoResolved,
    payment_methods: paymentMethods,
    achievements,
    updated_at: new Date().toISOString(),
  };

  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { data, error } = await supabase
    .from("td_company_structure")
    .upsert({
      id: ROW_ID,
      logo_url: next.logo_url,
      staff_contacts: next.staff_contacts,
      addresses: next.addresses,
      social_links: next.social_links,
      support_number: next.support_number,
      bank_accounts: next.bank_accounts,
      payment_methods: next.payment_methods,
      achievements: next.achievements,
      updated_at: next.updated_at,
      updated_by: actor?.id ?? null,
      updated_by_name: actor?.name ?? null,
    })
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  // RLS can "succeed" with 0 rows — treat that as failure so we never fake a save.
  if (!data) {
    throw new Error(
      "Structure save was blocked (no row returned). Check database permissions and try again."
    );
  }
  const saved = mapRow(data as Record<string, unknown>);
  logMasterDataChange({
    entityType: "company_structure",
    entityId: ROW_ID,
    action: "update",
    summary: "Updated company structure",
    before: { ...before },
    after: { ...saved },
    actor,
  });
  return saved;
}

export function emptyStaffContact(): StaffContact {
  return { id: uid(), name: "", emails: "", mobiles: "" };
}

export function emptyAddress(): CompanyAddress {
  return {
    id: uid(),
    street: "",
    area: "",
    city: "",
    state: "",
    pincode: "",
    landmark: "",
  };
}

export function emptyBankAccount(): BankAccount {
  return {
    id: uid(),
    bank_name: "",
    ifsc_code: "",
    account_name: "",
    account_number: "",
    account_type: "Current",
  };
}

export function emptyPaymentMethod(): PaymentMethod {
  return {
    id: uid(),
    type: "UPI",
    upi_id: "",
    receiver_name: "",
    mobile_number: "",
    qr_image_url: null,
  };
}

export function emptyAchievement(): CompanyAchievement {
  return {
    id: uid(),
    name: "",
    description: "",
    image_urls: [],
  };
}
