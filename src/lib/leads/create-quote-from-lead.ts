import type { UnifiedLead } from "@/lib/leads/unified-leads";
import { saveLeadConversion } from "@/lib/leads/unified-leads";
import {
  catalogFromMasterItineraries,
  type PackageCatalogEntry,
} from "@/lib/itinerary-builder/package-catalog";
import { createClientItineraryFromWizard } from "@/lib/itinerary-builder/storage";
import { listMasterItineraries } from "@/lib/master-data/itinerary-store";
import { ensureCustomer, pushCustomerToCrmWebhook } from "@/lib/crm/customers";
import type { ClientItineraryRecord, HotelCategoryKey } from "@/types/itinerary-builder";

function matchPackage(
  lead: UnifiedLead,
  catalog: PackageCatalogEntry[]
): PackageCatalogEntry | null {
  const hint = `${lead.package_hint ?? ""} ${lead.destination ?? ""}`.toLowerCase();
  if (!hint.trim() || catalog.length === 0) return null;

  const byLocation = catalog.find((p) =>
    p.locations.some((l) => hint.includes(l.name.toLowerCase()))
  );
  if (byLocation) return byLocation;

  const byTitle = catalog.find(
    (p) =>
      hint.includes(p.title.toLowerCase().slice(0, 12)) ||
      (p.tour_code && hint.includes(p.tour_code.toLowerCase()))
  );
  return byTitle ?? null;
}

export async function createQuoteFromLead(
  lead: UnifiedLead,
  categoryKeys: HotelCategoryKey[] = ["deluxe_hotels"]
): Promise<ClientItineraryRecord> {
  const customer = ensureCustomer({
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    lead_source: lead.source,
    notes: lead.notes,
  });

  const masterItems = await listMasterItineraries();
  const catalog = catalogFromMasterItineraries(masterItems, { includeInactive: true });
  const matched = matchPackage(lead, catalog);
  const template = matched?.buildTemplate();

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
    packageId: matched?.id ?? null,
    categoryKeys,
    title: template?.header.title,
    tourCode: template?.header.tour_code ?? null,
    alternateTitles: template?.header.alternate_titles,
    days: template?.days,
    inclusions: template?.inclusions,
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
