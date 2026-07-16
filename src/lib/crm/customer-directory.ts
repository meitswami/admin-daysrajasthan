import { getCustomerByEmail } from "@/lib/data/customer-links";
import {
  contactQueries,
  itineraryDownloads,
  packageInquiries,
  whatsappLeads,
} from "@/lib/data/mock-data";
import { ensureCustomer, listStoredCustomers, normalizePhone } from "@/lib/crm/customers";
import { listClientItineraries } from "@/lib/itinerary-builder/storage";
import type { CrmCustomer } from "@/types/customer";
import type { ClientItineraryRecord } from "@/types/itinerary-builder";
import type { CustomerProfile } from "@/lib/data/customer-links";

export type EnrichedCustomer = CrmCustomer & {
  quotes: ClientItineraryRecord[];
  quote_count: number;
  touchpoint_count: number;
  profile: CustomerProfile | null;
};

/** Seed CRM customers from mock website touchpoints (Dummy mode bootstrap) */
export function bootstrapCustomersFromTouchpoints(): CrmCustomer[] {
  for (const i of packageInquiries) {
    ensureCustomer({
      name: i.customer_name,
      email: i.email,
      phone: i.mobile,
      lead_source: "website_inquiry",
    });
  }
  for (const d of itineraryDownloads) {
    ensureCustomer({
      name: d.customer_name,
      email: d.email,
      phone: d.phone,
      lead_source: "download",
    });
  }
  for (const c of contactQueries) {
    ensureCustomer({
      name: c.name,
      email: c.email,
      phone: c.mobile,
      lead_source: "contact",
    });
  }
  for (const w of whatsappLeads) {
    ensureCustomer({
      name: w.customer_name ?? "WhatsApp Lead",
      email: null,
      phone: w.phone,
      lead_source: "whatsapp",
    });
  }
  return listStoredCustomers();
}

function quotesForCustomer(customer: CrmCustomer): ClientItineraryRecord[] {
  const quotes = listClientItineraries({ includeDeleted: true });
  const email = customer.email?.toLowerCase() ?? null;
  const phone = customer.phone_normalized;

  return quotes.filter((q) => {
    if (q.customer_id && q.customer_id === customer.id) return true;
    if (email && q.client_email?.toLowerCase() === email) return true;
    if (phone && normalizePhone(q.client_phone) === phone) return true;
    return false;
  });
}

export function listCrmCustomersEnriched(): EnrichedCustomer[] {
  let customers = listStoredCustomers();
  if (customers.length === 0) {
    customers = bootstrapCustomersFromTouchpoints();
  }

  return customers
    .map((c) => {
      const quotes = quotesForCustomer(c);
      const profile = c.email ? getCustomerByEmail(c.email) : null;
      const touchpoint_count = Math.max(1, (profile?.touchpointCount ?? 0) + quotes.length);

      return {
        ...c,
        quotes,
        quote_count: quotes.length,
        touchpoint_count,
        profile,
      };
    })
    .sort((a, b) => b.quote_count - a.quote_count || b.touchpoint_count - a.touchpoint_count);
}

export function getEnrichedCustomerById(id: string): EnrichedCustomer | null {
  return listCrmCustomersEnriched().find((c) => c.id === id) ?? null;
}
