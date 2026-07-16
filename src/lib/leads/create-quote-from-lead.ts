import type { UnifiedLead } from "@/lib/leads/unified-leads";
import { saveLeadConversion } from "@/lib/leads/unified-leads";
import { PACKAGE_CATALOG } from "@/lib/itinerary-builder/package-catalog";
import { createClientItineraryFromWizard } from "@/lib/itinerary-builder/storage";
import { ensureCustomer, pushCustomerToCrmWebhook } from "@/lib/crm/customers";
import type { ClientItineraryRecord, HotelCategoryKey } from "@/types/itinerary-builder";

function matchPackageId(lead: UnifiedLead): string | null {
  const hint = `${lead.package_hint ?? ""} ${lead.destination ?? ""}`.toLowerCase();
  if (!hint.trim()) return null;

  const byLocation = PACKAGE_CATALOG.find((p) =>
    p.locations.some((l) => hint.includes(l.name.toLowerCase()))
  );
  if (byLocation) return byLocation.id;

  const byTitle = PACKAGE_CATALOG.find(
    (p) =>
      hint.includes(p.title.toLowerCase().slice(0, 12)) ||
      (p.tour_code && hint.includes(p.tour_code.toLowerCase()))
  );
  return byTitle?.id ?? PACKAGE_CATALOG[1]?.id ?? null;
}

export function createQuoteFromLead(
  lead: UnifiedLead,
  categoryKeys: HotelCategoryKey[] = ["deluxe_hotels"]
): ClientItineraryRecord {
  const customer = ensureCustomer({
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    lead_source: lead.source,
    notes: lead.notes,
  });

  const packageId = matchPackageId(lead);
  const record = createClientItineraryFromWizard({
    client: {
      title: "Mr",
      client_name: lead.name,
      email: lead.email,
      phone: lead.phone,
      adults: lead.adults,
      children_5_12: lead.children,
      children_below_5: 0,
      travel_date: lead.travel_date,
      special_requests: lead.notes,
    },
    packageId,
    categoryKeys,
    lead_id: lead.id,
    lead_source: lead.source,
    customer_id: customer.id,
  });

  saveLeadConversion(lead.id, record.quote_id);

  void pushCustomerToCrmWebhook(customer, {
    quote_id: record.quote_id,
    lead_id: lead.id,
    lead_source: lead.source,
  });

  void import("@/lib/system/activity-log").then(({ logActivity }) =>
    logActivity({
      action: "lead_convert",
      module: "crm",
      entity_type: "lead",
      entity_id: lead.id,
      summary: `Lead ${lead.name} → ${record.quote_id} (customer ${customer.name})`,
      metadata: { customer_id: customer.id, quote_id: record.quote_id },
    })
  );

  return record;
}
