/**
 * Search repository — loads candidates ONLY through Knowledge / CRP / Quotation.
 * Never queries Supabase directly.
 */

import {
  listBlogs,
  listDestinations,
  listFaqs,
  listHotels,
  listPackages,
  type BlogRecord,
  type DestinationRecord,
  type FaqRecord,
  type HotelRecord,
  type PackageRecord,
} from "@/modules/knowledge";
import { listCustomers, listLeads, type CustomerRecord, type LeadRecord } from "@/modules/customer-relations";
import { listQuotations, type QuotationRecord } from "@/modules/quotation";

import { withSearchCache } from "./cache";
import { SEARCH_CACHE_PREFIX } from "./constants";

/**
 * Load package candidates via Knowledge Engine.
 */
export async function repoLoadPackages(regionCode?: string): Promise<PackageRecord[]> {
  const key = `${SEARCH_CACHE_PREFIX.packages}:${regionCode ?? "*"}`;
  return withSearchCache(key, () =>
    listPackages({
      regionCode,
      showOnWebsiteOnly: false,
      limit: 200,
    })
  );
}

/**
 * Load destination candidates via Knowledge Engine.
 */
export async function repoLoadDestinations(regionCode?: string): Promise<DestinationRecord[]> {
  const key = `${SEARCH_CACHE_PREFIX.destinations}:${regionCode ?? "*"}`;
  return withSearchCache(key, () =>
    listDestinations({
      regionCode,
      showOnWebsiteOnly: false,
      limit: 200,
    })
  );
}

/**
 * Load knowledge-domain records (hotels, blogs, faqs) via Knowledge Engine.
 */
export async function repoLoadKnowledgeBundle(regionCode?: string): Promise<{
  hotels: HotelRecord[];
  blogs: BlogRecord[];
  faqs: FaqRecord[];
}> {
  const key = `${SEARCH_CACHE_PREFIX.knowledge}:${regionCode ?? "*"}`;
  return withSearchCache(key, async () => {
    const [hotels, blogs, faqs] = await Promise.all([
      listHotels({ regionCode, limit: 200 }),
      listBlogs({ regionCode, limit: 100 }),
      listFaqs({ regionCode, limit: 50 }),
    ]);
    return { hotels, blogs, faqs };
  });
}

/**
 * Load customers via Customer Relationship Platform.
 */
export async function repoLoadCustomers(): Promise<CustomerRecord[]> {
  return withSearchCache(SEARCH_CACHE_PREFIX.customers, () => listCustomers({ limit: 200 }));
}

/**
 * Load leads via Customer Relationship Platform.
 */
export async function repoLoadLeads(): Promise<LeadRecord[]> {
  return withSearchCache(SEARCH_CACHE_PREFIX.leads, () => listLeads({ limit: 200 }));
}

/**
 * Load quotations via Quotation Engine.
 */
export async function repoLoadQuotations(): Promise<QuotationRecord[]> {
  return withSearchCache(SEARCH_CACHE_PREFIX.quotations, () => listQuotations({ limit: 200 }));
}
