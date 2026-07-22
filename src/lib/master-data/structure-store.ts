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
import {
  DEFAULT_ACHIEVEMENT_DESCRIPTION,
  DEFAULT_ACHIEVEMENT_IMAGES,
  DEFAULT_ACHIEVEMENT_NAME,
  DEFAULT_COMPANY_LOGO_URL,
} from "@/types/company-structure";
import { isRealDataMode, isSupabaseConfigured } from "@/lib/system/data-mode";
import { logMasterDataChange } from "@/lib/master-data/audit";
import { ensureStoredImageUrls } from "@/lib/supabase/storage-upload";

function useSupabaseMaster(): boolean {
  return isSupabaseConfigured() && isRealDataMode();
}

const STORAGE_KEY = "td-company-structure-v2";
const ROW_ID = "default";

function uid(): string {
  return crypto.randomUUID();
}

function defaultAchievements(): CompanyAchievement[] {
  return [
    {
      id: uid(),
      name: DEFAULT_ACHIEVEMENT_NAME,
      description: DEFAULT_ACHIEVEMENT_DESCRIPTION,
      image_urls: [...DEFAULT_ACHIEVEMENT_IMAGES],
    },
  ];
}

export function defaultCompanyStructure(): CompanyStructure {
  return {
    logo_url: DEFAULT_COMPANY_LOGO_URL,
    staff_contacts: [
      {
        id: uid(),
        name: "Vandana Shekhawat",
        emails: "rajasthantouringjaipur@gmail.com",
        mobiles: "+919351549292",
      },
      {
        id: uid(),
        name: "Shatrughan Singh",
        emails: "rajasthantouringjaipur@gmail.com",
        mobiles: "+918058100276",
      },
      {
        id: uid(),
        name: "Hemendra Singh",
        emails: "rajasthantouringjaipur@gmail.com",
        mobiles: "+919257368877",
      },
      {
        id: uid(),
        name: "Priya Vohra",
        emails: "sales.rajasthantouring@gmail.com",
        mobiles: "+918766266066",
      },
      {
        id: uid(),
        name: "Soniya Shekhawat",
        emails: "soniya.rajasthantouring@gmail.com",
        mobiles: "+917357571614",
      },
      {
        id: uid(),
        name: "Pooja Shekhawat",
        emails: "pooja.rajasthantouring@gmail.com",
        mobiles: "+919784011614",
      },
    ],
    addresses: [
      {
        id: uid(),
        street: "74, Deewan Nagar, Daulatpura Road, Khora Bisal",
        area: "Benar",
        city: "Jaipur",
        state: "Rajasthan India",
        pincode: "302012",
        landmark: "N/A",
      },
    ],
    social_links: {
      facebook: "https://www.facebook.com/RajasthanTouring",
      instagram: "https://www.instagram.com/rajasthan_touring",
      youtube: "https://www.youtube.com/@rajasthantouring",
      website: "www.rajasthantouring.com",
    },
    support_number: "9509911614",
    bank_accounts: [
      {
        id: uid(),
        bank_name: "Bank of India",
        ifsc_code: "BKID0007482",
        account_name: "Welcome Rajasthan",
        account_number: "748220110000989",
        account_type: "Current",
      },
    ],
    payment_methods: [
      {
        id: uid(),
        type: "UPI",
        upi_id: "sales.welcomerajasthantours@okicici",
        receiver_name: "Welcome Rajasthan",
        mobile_number: "+91 9588911614",
        qr_image_url: "/structure-upi-qr.png",
      },
    ],
    achievements: defaultAchievements(),
    updated_at: new Date().toISOString(),
  };
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
    logo_url: (row.logo_url as string | null) ?? DEFAULT_COMPANY_LOGO_URL,
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
    achievements:
      achievementsRaw.length > 0
        ? achievementsRaw.map((a) => ({
            id: a.id || uid(),
            name: a.name ?? "",
            description: a.description ?? "",
            image_urls: Array.isArray(a.image_urls)
              ? a.image_urls.filter(Boolean)
              : [...DEFAULT_ACHIEVEMENT_IMAGES],
          }))
        : defaultAchievements(),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function readLocal(): CompanyStructure {
  if (typeof window === "undefined") return defaultCompanyStructure();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = defaultCompanyStructure();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return mapRow(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return defaultCompanyStructure();
  }
}

function writeLocal(data: CompanyStructure) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function getCompanyStructure(): Promise<CompanyStructure> {
  if (useSupabaseMaster()) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("td_company_structure")
        .select("*")
        .eq("id", ROW_ID)
        .maybeSingle();
      if (!error && data) {
        const mapped = mapRow(data as Record<string, unknown>);
        if (
          mapped.staff_contacts.length === 0 &&
          mapped.bank_accounts.length === 0 &&
          !mapped.support_number
        ) {
          return defaultCompanyStructure();
        }
        return mapped;
      }
    } catch {
      // fall through
    }
  }
  return readLocal();
}

export async function saveCompanyStructure(
  draft: CompanyStructure,
  actor?: TeamMember
): Promise<CompanyStructure> {
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

  let persisted = false;
  if (useSupabaseMaster()) {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.from("td_company_structure").upsert({
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
      });
      if (!error) persisted = true;
    } catch {
      // fall through
    }
  }

  if (!persisted) {
    writeLocal(next);
  }

  logMasterDataChange({
    entityType: "company_structure",
    entityId: ROW_ID,
    action: "update",
    summary: "Updated company structure",
    before: { ...before },
    after: { ...next },
    actor,
  });

  return next;
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
