import {
  contactQueries,
  itineraryDownloads,
  packageInquiries,
  whatsappLeads,
} from "./mock-data";

export type CustomerProfile = {
  email: string;
  name: string | null;
  phone: string | null;
  inquiries: typeof packageInquiries;
  downloads: typeof itineraryDownloads;
  contacts: typeof contactQueries;
  whatsapp: typeof whatsappLeads;
  touchpointCount: number;
  crmSynced: boolean;
};

function normalizePhone(p: string) {
  return p.replace(/\D/g, "").slice(-10);
}

export function getCustomerByEmail(email: string): CustomerProfile | null {
  const inquiries = packageInquiries.filter((i) => i.email.toLowerCase() === email.toLowerCase());
  const downloads = itineraryDownloads.filter((d) => d.email.toLowerCase() === email.toLowerCase());
  const contacts = contactQueries.filter((c) => c.email.toLowerCase() === email.toLowerCase());
  const phone =
    inquiries[0]?.mobile ?? downloads[0]?.phone ?? contacts[0]?.mobile ?? null;
  const whatsapp = phone
    ? whatsappLeads.filter((w) => normalizePhone(w.phone) === normalizePhone(phone))
    : [];

  if (!inquiries.length && !downloads.length && !contacts.length && !whatsapp.length) {
    return null;
  }

  const name =
    inquiries[0]?.customer_name ??
    downloads[0]?.customer_name ??
    contacts[0]?.name ??
    whatsapp[0]?.customer_name ??
    null;

  const syncedItems = [
    ...downloads.map((d) => d.synced_to_crm),
    ...whatsapp.map((w) => w.synced_to_crm),
  ];

  return {
    email,
    name,
    phone,
    inquiries,
    downloads,
    contacts,
    whatsapp,
    touchpointCount: inquiries.length + downloads.length + contacts.length + whatsapp.length,
    crmSynced: syncedItems.length > 0 && syncedItems.every(Boolean),
  };
}

export function getLinkedCustomers() {
  const emails = new Set<string>();
  packageInquiries.forEach((i) => emails.add(i.email.toLowerCase()));
  itineraryDownloads.forEach((d) => emails.add(d.email.toLowerCase()));
  contactQueries.forEach((c) => emails.add(c.email.toLowerCase()));

  return [...emails]
    .map((email) => getCustomerByEmail(email))
    .filter((p): p is CustomerProfile => p !== null && p.touchpointCount > 1)
    .sort((a, b) => b.touchpointCount - a.touchpointCount);
}
