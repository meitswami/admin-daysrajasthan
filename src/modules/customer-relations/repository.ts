/**
 * CRP repository — storage access only (mock / future Supabase / cache hooks).
 * No business rules.
 */

import { DATA_SOURCE } from "@/lib/data";
import {
  contactQueries,
  packageInquiries,
  whatsappLeads,
} from "@/lib/data/mock-data";
import { ensureCustomer } from "@/lib/crm/customers";
import type { EnsureCustomerInput } from "@/types/customer";
import { createClient } from "@/lib/supabase/server";

import { withCrpCache } from "./cache";
import { CRP_CACHE_PREFIX } from "./constants";
import {
  mapContactToInquiry,
  mapContactToLead,
  mapCrmCustomerToRecord,
  mapPackageInquiryToLead,
  mapWhatsappToLead,
} from "./mappers";
import {
  crpNewId,
  getLeadOverride,
  getStoreCustomer,
  listActivities,
  listAssignments,
  listCommunications,
  listFollowUps,
  listNotes,
  listStoreCustomers,
  pushActivity,
  pushAssignment,
  pushCommunication,
  pushFollowUp,
  pushNote,
  setLeadOverride,
  updateFollowUp,
  upsertStoreCustomer,
} from "./store";
import type {
  ActivityRecord,
  AssignmentRecord,
  CommunicationRecord,
  CreateAssignmentInput,
  CreateFollowUpInput,
  CreateNoteInput,
  CustomerRecord,
  FollowUpRecord,
  InquiryRecord,
  LeadRecord,
  LogCommunicationInput,
  NoteRecord,
} from "./types";

function useSupabase(): boolean {
  return DATA_SOURCE === "supabase";
}

/**
 * Load all leads from Travel Days source tables (mock or supabase).
 */
export async function repoListLeads(): Promise<LeadRecord[]> {
  return withCrpCache(CRP_CACHE_PREFIX.leads, async () => {
    let leads: LeadRecord[] = [];

    if (!useSupabase()) {
      leads = [
        ...packageInquiries.map(mapPackageInquiryToLead),
        ...whatsappLeads.map(mapWhatsappToLead),
        ...contactQueries.map(mapContactToLead),
      ];
    } else {
      const supabase = await createClient();
      const [inq, wa, contact] = await Promise.all([
        supabase.from("package_inquiries").select("*").order("created_at", { ascending: false }),
        supabase.from("whatsapp_leads").select("*").order("created_at", { ascending: false }),
        supabase.from("contact_queries").select("*").order("created_at", { ascending: false }),
      ]);
      if (inq.error) throw inq.error;
      if (wa.error) throw wa.error;
      if (contact.error) throw contact.error;
      leads = [
        ...(inq.data ?? []).map(mapPackageInquiryToLead),
        ...(wa.data ?? []).map(mapWhatsappToLead),
        ...(contact.data ?? []).map(mapContactToLead),
      ];
    }

    return leads.map((lead) => {
      const o = getLeadOverride(lead.id);
      return {
        ...lead,
        qualification: o.qualification ?? lead.qualification,
        lifecycleStage: o.lifecycleStage ?? lead.lifecycleStage,
        customerId: o.customerId ?? lead.customerId,
        quotationId: o.quotationId ?? lead.quotationId,
      };
    });
  });
}

/**
 * Get one lead by CRP id.
 */
export async function repoGetLead(leadId: string): Promise<LeadRecord | null> {
  const all = await repoListLeads();
  return all.find((l) => l.id === leadId) ?? null;
}

/**
 * Persist lead override fields (qualification / links) without duplicating source rows.
 */
export async function repoPatchLead(
  leadId: string,
  patch: Parameters<typeof setLeadOverride>[1]
): Promise<LeadRecord | null> {
  setLeadOverride(leadId, patch);
  return repoGetLead(leadId);
}

/**
 * List inquiries from contact_queries (+ future inquiry tables).
 */
export async function repoListInquiries(): Promise<InquiryRecord[]> {
  return withCrpCache(CRP_CACHE_PREFIX.inquiries, async () => {
    if (!useSupabase()) {
      return contactQueries.map(mapContactToInquiry);
    }
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("contact_queries")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapContactToInquiry);
  });
}

/**
 * Ensure / upsert customer via existing customer helper + store DTO.
 */
export async function repoEnsureCustomer(input: EnsureCustomerInput): Promise<CustomerRecord> {
  const crm = ensureCustomer(input);
  const existing = getStoreCustomer(crm.id);
  const record = mapCrmCustomerToRecord(crm, existing?.lifecycleStage ?? "lead");
  if (existing) {
    record.quotationIds = existing.quotationIds;
    record.lifecycleStage = existing.lifecycleStage;
    record.notes = existing.notes ?? record.notes;
  }
  upsertStoreCustomer(record);
  return record;
}

/**
 * List customers known to CRP store (+ ensured profiles).
 */
export async function repoListCustomers(): Promise<CustomerRecord[]> {
  return withCrpCache(CRP_CACHE_PREFIX.customers, async () => listStoreCustomers());
}

/**
 * Get customer by id.
 */
export async function repoGetCustomer(id: string): Promise<CustomerRecord | null> {
  return getStoreCustomer(id);
}

/**
 * Update customer DTO in store.
 */
export async function repoUpdateCustomer(customer: CustomerRecord): Promise<CustomerRecord> {
  upsertStoreCustomer(customer);
  return customer;
}

/** Insert communication log. */
export async function repoInsertCommunication(
  input: LogCommunicationInput
): Promise<CommunicationRecord> {
  const row: CommunicationRecord = {
    id: crpNewId(),
    customerId: input.customerId ?? null,
    leadId: input.leadId ?? null,
    channel: input.channel,
    direction: input.direction,
    subject: input.subject ?? null,
    body: input.body,
    metadata: input.metadata ?? {},
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    createdBy: input.createdBy ?? null,
  };
  pushCommunication(row);
  return row;
}

export async function repoListCommunications(): Promise<CommunicationRecord[]> {
  return listCommunications();
}

export async function repoInsertAssignment(
  input: CreateAssignmentInput
): Promise<AssignmentRecord> {
  const row: AssignmentRecord = {
    id: crpNewId(),
    entityType: input.entityType,
    entityId: input.entityId,
    assignedTo: input.assignedTo,
    assignedBy: input.assignedBy,
    assignedAt: new Date().toISOString(),
    priority: input.priority ?? "medium",
    dueDate: input.dueDate ?? null,
    status: "open",
    note: input.note ?? null,
  };
  pushAssignment(row);
  return row;
}

export async function repoListAssignments(): Promise<AssignmentRecord[]> {
  return listAssignments();
}

export async function repoInsertFollowUp(input: CreateFollowUpInput): Promise<FollowUpRecord> {
  const row: FollowUpRecord = {
    id: crpNewId(),
    customerId: input.customerId ?? null,
    leadId: input.leadId ?? null,
    title: input.title,
    dueAt: input.dueAt,
    status: input.status ?? "scheduled",
    recurring: input.recurring ?? false,
    recurrenceRule: input.recurrenceRule ?? null,
    completedAt: null,
    assignedTo: input.assignedTo ?? null,
    createdAt: new Date().toISOString(),
  };
  pushFollowUp(row);
  return row;
}

export async function repoListFollowUps(): Promise<FollowUpRecord[]> {
  return listFollowUps();
}

export async function repoUpdateFollowUpStatus(
  id: string,
  status: FollowUpRecord["status"]
): Promise<FollowUpRecord | null> {
  return updateFollowUp(id, {
    status,
    completedAt: status === "completed" ? new Date().toISOString() : null,
  });
}

export async function repoInsertNote(input: CreateNoteInput): Promise<NoteRecord> {
  const now = new Date().toISOString();
  const row: NoteRecord = {
    id: crpNewId(),
    customerId: input.customerId ?? null,
    leadId: input.leadId ?? null,
    body: input.body,
    visibility: input.visibility ?? "private",
    pinned: input.pinned ?? false,
    attachmentIds: [],
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  };
  pushNote(row);
  return row;
}

export async function repoListNotes(): Promise<NoteRecord[]> {
  return listNotes();
}

export async function repoInsertActivity(
  row: Omit<ActivityRecord, "id"> & { id?: string }
): Promise<ActivityRecord> {
  const full: ActivityRecord = { ...row, id: row.id ?? crpNewId() };
  pushActivity(full);
  return full;
}

export async function repoListActivities(): Promise<ActivityRecord[]> {
  return listActivities();
}
