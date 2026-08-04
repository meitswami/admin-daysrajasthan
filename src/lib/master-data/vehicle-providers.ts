import type { VehicleProvider, WebsiteContentItem } from "@/types/database";

export function emptyVehicleProvider(): VehicleProvider {
  return {
    id: crypto.randomUUID(),
    provider_company_name: "",
    contact_person_name: "",
    contact_phone_1: "",
    contact_phone_2: "",
    price_per_km: "",
    price_per_day: "",
  };
}

function trimOrNull(value?: string | null): string | null {
  const t = value?.trim();
  return t ? t : null;
}

export function sanitizeVehicleProvider(raw: Partial<VehicleProvider> & { id?: string }): VehicleProvider {
  return {
    id: raw.id?.trim() || crypto.randomUUID(),
    provider_company_name: raw.provider_company_name?.trim() || "",
    contact_person_name: trimOrNull(raw.contact_person_name),
    contact_phone_1: trimOrNull(raw.contact_phone_1),
    contact_phone_2: trimOrNull(raw.contact_phone_2),
    price_per_km: trimOrNull(raw.price_per_km),
    price_per_day: trimOrNull(raw.price_per_day),
  };
}

function providerHasContent(p: VehicleProvider): boolean {
  return Boolean(
    p.provider_company_name.trim() ||
      p.contact_person_name?.trim() ||
      p.contact_phone_1?.trim() ||
      p.contact_phone_2?.trim() ||
      p.price_per_km?.trim() ||
      p.price_per_day?.trim()
  );
}

/** Prefer JSONB `providers`; fall back to legacy flat columns. */
export function normalizeVehicleProviders(
  item: Pick<
    WebsiteContentItem,
    | "providers"
    | "provider_company_name"
    | "contact_person_name"
    | "contact_phone_1"
    | "contact_phone_2"
    | "price_per_km"
    | "price_per_day"
  >
): VehicleProvider[] {
  if (Array.isArray(item.providers) && item.providers.length > 0) {
    return item.providers.map((p) => sanitizeVehicleProvider(p)).filter(providerHasContent);
  }

  const legacy = sanitizeVehicleProvider({
    id: "legacy",
    provider_company_name: item.provider_company_name ?? "",
    contact_person_name: item.contact_person_name,
    contact_phone_1: item.contact_phone_1,
    contact_phone_2: item.contact_phone_2,
    price_per_km: item.price_per_km,
    price_per_day: item.price_per_day,
  });
  return providerHasContent(legacy) ? [legacy] : [];
}

/** Keep first provider mirrored on flat columns for older consumers. */
export function flatFieldsFromProviders(providers: VehicleProvider[]): {
  provider_company_name: string | null;
  contact_person_name: string | null;
  contact_phone_1: string | null;
  contact_phone_2: string | null;
  price_per_km: string | null;
  price_per_day: string | null;
  providers: VehicleProvider[];
} {
  const cleaned = providers.map(sanitizeVehicleProvider).filter(providerHasContent);
  const first = cleaned[0];
  return {
    providers: cleaned,
    provider_company_name: first?.provider_company_name.trim() || null,
    contact_person_name: first?.contact_person_name ?? null,
    contact_phone_1: first?.contact_phone_1 ?? null,
    contact_phone_2: first?.contact_phone_2 ?? null,
    price_per_km: first?.price_per_km ?? null,
    price_per_day: first?.price_per_day ?? null,
  };
}

function formatInr(value?: string | null): string {
  const v = value?.trim();
  if (!v) return "—";
  return /^₹/.test(v) ? v : `₹${v}`;
}

function phonesLabel(p: VehicleProvider): string {
  return [p.contact_phone_1, p.contact_phone_2].filter(Boolean).join(" · ") || "—";
}

/** Structured lines for the itinerary-builder info popover. */
export function vehicleProviderDetailBlocks(providers: VehicleProvider[]): {
  title: string;
  lines: { label: string; value: string }[];
}[] {
  if (!providers.length) return [];

  return providers.map((p, index) => ({
    title: providers.length > 1 ? `Provider ${index + 1}` : "Provider",
    lines: [
      { label: "Provider", value: p.provider_company_name.trim() || "—" },
      { label: "Contact", value: p.contact_person_name?.trim() || "—" },
      { label: "Phones", value: phonesLabel(p) },
      { label: "Per km", value: formatInr(p.price_per_km) },
      { label: "Per day", value: formatInr(p.price_per_day) },
    ],
  }));
}

/** Vehicle + provider lines for the itinerary-builder info popover. */
export function vehicleDetailBlocks(
  vehicle: Pick<
    WebsiteContentItem,
    | "name"
    | "vehicle_type"
    | "capacity"
    | "providers"
    | "provider_company_name"
    | "contact_person_name"
    | "contact_phone_1"
    | "contact_phone_2"
    | "price_per_km"
    | "price_per_day"
  > | null
): {
  title: string;
  lines: { label: string; value: string }[];
}[] {
  if (!vehicle) {
    return [
      {
        title: "Vehicle",
        lines: [{ label: "Status", value: "Not found in master data" }],
      },
    ];
  }

  const capacity = vehicle.capacity?.trim();
  const blocks: {
    title: string;
    lines: { label: string; value: string }[];
  }[] = [
    {
      title: "Vehicle",
      lines: [
        { label: "Model", value: vehicle.name.trim() || "—" },
        { label: "Type", value: vehicle.vehicle_type?.trim() || "—" },
        { label: "Capacity", value: capacity ? `${capacity} seater` : "—" },
      ],
    },
  ];

  const providerBlocks = vehicleProviderDetailBlocks(normalizeVehicleProviders(vehicle));
  if (providerBlocks.length) {
    blocks.push(...providerBlocks);
  }

  return blocks;
}

export function parseProvidersColumn(raw: unknown): VehicleProvider[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const list = raw
    .filter((p): p is Record<string, unknown> => Boolean(p) && typeof p === "object")
    .map((p) =>
      sanitizeVehicleProvider({
        id: typeof p.id === "string" ? p.id : undefined,
        provider_company_name:
          typeof p.provider_company_name === "string" ? p.provider_company_name : "",
        contact_person_name:
          typeof p.contact_person_name === "string" ? p.contact_person_name : null,
        contact_phone_1: typeof p.contact_phone_1 === "string" ? p.contact_phone_1 : null,
        contact_phone_2: typeof p.contact_phone_2 === "string" ? p.contact_phone_2 : null,
        price_per_km: typeof p.price_per_km === "string" ? p.price_per_km : null,
        price_per_day: typeof p.price_per_day === "string" ? p.price_per_day : null,
      })
    )
    .filter(providerHasContent);
  return list;
}
