import type {
  ContactQuery,
  PackageInquiry,
  WhatsappLead,
} from "@/types/database";
import type { CrmCustomer } from "@/types/customer";

import type {
  CustomerLifecycleStage,
  CustomerRecord,
  InquiryRecord,
  LeadChannel,
  LeadQualificationStatus,
  LeadRecord,
} from "./types";

function mapInquiryStatus(status: string): LeadQualificationStatus {
  switch (status) {
    case "contacted":
      return "contacted";
    case "quoted":
      return "qualified";
    case "converted":
      return "converted";
    case "closed":
      return "closed";
    default:
      return "new";
  }
}

function qualificationToStage(q: LeadQualificationStatus): CustomerLifecycleStage {
  switch (q) {
    case "contacted":
      return "inquiry";
    case "qualified":
      return "qualified_lead";
    case "converted":
      return "quotation";
    default:
      return "lead";
  }
}

/** Map package inquiry row → LeadRecord. */
export function mapPackageInquiryToLead(row: PackageInquiry): LeadRecord {
  const qualification = mapInquiryStatus(row.status);
  return {
    id: `website_inquiry:${row.id}`,
    channel: "website",
    sourceTable: "package_inquiries",
    sourceId: row.id,
    name: row.customer_name,
    email: row.email,
    phone: row.mobile,
    destination: row.destination,
    travelDate: row.travel_date,
    adults: row.adults,
    children: row.children,
    packageHint: row.destination,
    notes: row.additional_requirements,
    qualification,
    lifecycleStage: qualificationToStage(qualification),
    customerId: null,
    quotationId: null,
    createdAt: row.created_at,
  };
}

/** Map WhatsApp lead row → LeadRecord. */
export function mapWhatsappToLead(row: WhatsappLead): LeadRecord {
  return {
    id: `whatsapp:${row.id}`,
    channel: "whatsapp",
    sourceTable: "whatsapp_leads",
    sourceId: row.id,
    name: row.customer_name ?? "WhatsApp Lead",
    email: null,
    phone: row.phone,
    destination: row.destination,
    travelDate: null,
    adults: 2,
    children: 0,
    packageHint: row.selected_package,
    notes: null,
    qualification: "new",
    lifecycleStage: "lead",
    customerId: null,
    quotationId: null,
    createdAt: row.created_at,
  };
}

/** Map contact query → LeadRecord + inquiry. */
export function mapContactToLead(row: ContactQuery): LeadRecord {
  return {
    id: `contact:${row.id}`,
    channel: "contact",
    sourceTable: "contact_queries",
    sourceId: row.id,
    name: row.name,
    email: row.email,
    phone: row.mobile,
    destination: null,
    travelDate: null,
    adults: 1,
    children: 0,
    packageHint: null,
    notes: row.message,
    qualification: row.status === "resolved" ? "closed" : "new",
    lifecycleStage: row.status === "resolved" ? "inquiry" : "lead",
    customerId: null,
    quotationId: null,
    createdAt: row.created_at,
  };
}

/** Map contact query → InquiryRecord. */
export function mapContactToInquiry(row: ContactQuery): InquiryRecord {
  return {
    id: row.id,
    leadId: `contact:${row.id}`,
    customerId: null,
    subject: row.subject ?? "Contact form",
    message: row.message,
    destination: null,
    status: row.status === "resolved" ? "resolved" : "open",
    createdAt: row.created_at,
    resolvedAt: null,
  };
}

/** Map td_customers / CrmCustomer → CustomerRecord. */
export function mapCrmCustomerToRecord(
  row: CrmCustomer,
  lifecycleStage: CustomerLifecycleStage = "lead"
): CustomerRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    lifecycleStage,
    leadSource: row.lead_source,
    notes: row.notes,
    quotationIds: row.quote_ids ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function channelFromSource(source: string): LeadChannel {
  if (source === "whatsapp") return "whatsapp";
  if (source === "contact") return "contact";
  if (source === "email") return "email";
  if (source === "website_inquiry") return "website";
  return "other";
}
