import type { CrmCustomer, EnsureCustomerInput } from "@/types/customer";
import { newUuid } from "@/lib/itinerary-builder/defaults";
import { isRealDataMode, isSupabaseConfigured } from "@/lib/system/data-mode";

const STORAGE_KEY = "travel-days-customers-v1";

export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return digits.slice(-10);
}

function loadLocal(): CrmCustomer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CrmCustomer[]) : [];
  } catch {
    return [];
  }
}

function saveLocal(customers: CrmCustomer[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
}

function now() {
  return new Date().toISOString();
}

function matchLocal(customers: CrmCustomer[], input: EnsureCustomerInput): CrmCustomer | null {
  const email = input.email?.trim().toLowerCase() || null;
  const phoneNorm = normalizePhone(input.phone);

  if (email) {
    const byEmail = customers.find((c) => c.email?.toLowerCase() === email);
    if (byEmail) return byEmail;
  }
  if (phoneNorm) {
    const byPhone = customers.find((c) => c.phone_normalized === phoneNorm);
    if (byPhone) return byPhone;
  }
  return null;
}

async function upsertCustomerToSupabase(customer: CrmCustomer): Promise<void> {
  if (!isRealDataMode() || !isSupabaseConfigured()) return;
  try {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.from("td_customers").upsert({
      id: customer.id,
      email: customer.email,
      phone: customer.phone,
      phone_normalized: customer.phone_normalized,
      name: customer.name,
      notes: customer.notes,
      lead_source: customer.lead_source,
      crm_synced: customer.crm_synced,
      crm_synced_at: customer.crm_synced_at,
      created_at: customer.created_at,
      updated_at: customer.updated_at,
    });
  } catch (e) {
    console.warn("[crm] customer upsert failed", e);
  }
}

/** Find or create a CRM customer from lead/client details */
export function ensureCustomer(input: EnsureCustomerInput): CrmCustomer {
  const customers = loadLocal();
  const existing = matchLocal(customers, input);
  const t = now();

  if (existing) {
    const updated: CrmCustomer = {
      ...existing,
      name: existing.name || input.name,
      email: existing.email ?? (input.email?.trim() || null),
      phone: existing.phone ?? (input.phone?.trim() || null),
      phone_normalized: existing.phone_normalized ?? normalizePhone(input.phone),
      notes: existing.notes ?? input.notes ?? null,
      lead_source: existing.lead_source ?? input.lead_source ?? null,
      updated_at: t,
    };
    const idx = customers.findIndex((c) => c.id === existing.id);
    customers[idx] = updated;
    saveLocal(customers);
    void upsertCustomerToSupabase(updated);
    return updated;
  }

  const created: CrmCustomer = {
    id: newUuid(),
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    phone_normalized: normalizePhone(input.phone),
    name: input.name.trim() || "Guest",
    notes: input.notes ?? null,
    lead_source: input.lead_source ?? null,
    crm_synced: false,
    crm_synced_at: null,
    created_at: t,
    updated_at: t,
  };
  customers.unshift(created);
  saveLocal(customers);
  void upsertCustomerToSupabase(created);
  return created;
}

export function getCustomerById(id: string): CrmCustomer | null {
  return loadLocal().find((c) => c.id === id) ?? null;
}

export function listStoredCustomers(): CrmCustomer[] {
  return loadLocal().sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

export function markCustomerCrmSynced(id: string): CrmCustomer | null {
  const customers = loadLocal();
  const idx = customers.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  const t = now();
  customers[idx] = {
    ...customers[idx],
    crm_synced: true,
    crm_synced_at: t,
    updated_at: t,
  };
  saveLocal(customers);
  void upsertCustomerToSupabase(customers[idx]);
  return customers[idx];
}

export async function pushCustomerToCrmWebhook(customer: CrmCustomer, extra?: Record<string, unknown>) {
  try {
    const res = await fetch("/api/crm/push-customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "customer.upsert",
        customer,
        ...extra,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { mode?: string };
      if (data.mode === "webhook") markCustomerCrmSynced(customer.id);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
