/**
 * Customer Relationship Platform — business logic only.
 * All storage via repository. Knowledge / Quotation engines are called, never modified.
 */

import { ModuleError } from "@/modules/shared";
import { QUALIFICATION_TO_LIFECYCLE, CRP_DEFAULT_LIST_LIMIT } from "./constants";
import {
  repoEnsureCustomer,
  repoGetCustomer,
  repoGetLead,
  repoInsertActivity,
  repoInsertAssignment,
  repoInsertCommunication,
  repoInsertFollowUp,
  repoInsertNote,
  repoListActivities,
  repoListAssignments,
  repoListCommunications,
  repoListCustomers,
  repoListFollowUps,
  repoListInquiries,
  repoListLeads,
  repoListNotes,
  repoPatchLead,
  repoUpdateCustomer,
  repoUpdateFollowUpStatus,
} from "./repository";
import type {
  ActivityRecord,
  AssignmentRecord,
  CommunicationRecord,
  ConvertLeadInput,
  CreateAssignmentInput,
  CreateFollowUpInput,
  CreateNoteInput,
  CrpListFilters,
  CustomerProfileRenderPayload,
  CustomerRecord,
  CustomerTimelineRenderPayload,
  FollowUpRecord,
  InquiryRecord,
  LeadRecord,
  LogCommunicationInput,
  NoteRecord,
  QualifyLeadInput,
  TimelineItem,
} from "./types";
import {
  parseConvertLeadInput,
  parseCreateAssignmentInput,
  parseCreateFollowUpInput,
  parseCreateNoteInput,
  parseCrpListFilters,
  parseLogCommunicationInput,
  parseQualifyLeadInput,
} from "./validators";

function matchQuery(
  text: string,
  query: string | undefined
): boolean {
  if (!query?.trim()) return true;
  return text.toLowerCase().includes(query.trim().toLowerCase());
}

async function recordActivity(
  partial: Omit<ActivityRecord, "id">
): Promise<ActivityRecord> {
  return repoInsertActivity(partial);
}

/**
 * List leads across website / WhatsApp / contact sources.
 */
export async function listLeads(filters: CrpListFilters = {}): Promise<LeadRecord[]> {
  const parsed = parseCrpListFilters(filters);
  let rows = await repoListLeads();
  if (parsed.lifecycleStage) {
    rows = rows.filter((l) => l.lifecycleStage === parsed.lifecycleStage);
  }
  if (parsed.customerId) {
    rows = rows.filter((l) => l.customerId === parsed.customerId);
  }
  if (parsed.query) {
    rows = rows.filter((l) =>
      matchQuery([l.name, l.email, l.phone, l.destination].filter(Boolean).join(" "), parsed.query)
    );
  }
  return rows
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, parsed.limit ?? CRP_DEFAULT_LIST_LIMIT);
}

/**
 * Get a lead by id.
 */
export async function getLead(leadId: string): Promise<LeadRecord | null> {
  return repoGetLead(leadId);
}

/**
 * Qualify a lead and advance lifecycle stage.
 */
export async function qualifyLead(input: QualifyLeadInput): Promise<LeadRecord> {
  const parsed = parseQualifyLeadInput(input);
  const lead = await repoGetLead(parsed.leadId);
  if (!lead) {
    throw new ModuleError("customer-relations", "LEAD_NOT_FOUND", `Lead not found: ${parsed.leadId}`);
  }

  const lifecycleStage = QUALIFICATION_TO_LIFECYCLE[parsed.qualification];
  const updated = await repoPatchLead(parsed.leadId, {
    qualification: parsed.qualification,
    lifecycleStage,
  });
  if (!updated) {
    throw new ModuleError("customer-relations", "QUALIFY_FAILED", "Could not update lead");
  }

  await recordActivity({
    customerId: updated.customerId,
    leadId: updated.id,
    kind: "lifecycle",
    title: "Lead Qualified",
    summary: `Qualification → ${parsed.qualification}`,
    occurredAt: new Date().toISOString(),
    relatedEntityType: "lead",
    relatedEntityId: updated.id,
  });

  return updated;
}

/**
 * Convert a lead into a customer profile (repeat-safe upsert by email/phone).
 */
export async function convertLeadToCustomer(input: ConvertLeadInput): Promise<{
  lead: LeadRecord;
  customer: CustomerRecord;
}> {
  const parsed = parseConvertLeadInput(input);
  const lead = await repoGetLead(parsed.leadId);
  if (!lead) {
    throw new ModuleError("customer-relations", "LEAD_NOT_FOUND", `Lead not found: ${parsed.leadId}`);
  }

  const customer = await repoEnsureCustomer({
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    lead_source: lead.channel,
    notes: lead.notes,
  });

  customer.lifecycleStage =
    lead.qualification === "converted" || lead.quotationId
      ? "quotation"
      : "qualified_lead";
  await repoUpdateCustomer(customer);

  const updatedLead = await repoPatchLead(lead.id, {
    customerId: customer.id,
    qualification: lead.qualification === "new" ? "qualified" : lead.qualification,
    lifecycleStage: customer.lifecycleStage,
  });

  await recordActivity({
    customerId: customer.id,
    leadId: lead.id,
    kind: "lifecycle",
    title: "Customer Created",
    summary: `Lead converted to customer ${customer.name}`,
    occurredAt: new Date().toISOString(),
    relatedEntityType: "customer",
    relatedEntityId: customer.id,
  });

  return { lead: updatedLead!, customer };
}

/**
 * List inquiries.
 */
export async function listInquiries(filters: CrpListFilters = {}): Promise<InquiryRecord[]> {
  const parsed = parseCrpListFilters(filters);
  let rows = await repoListInquiries();
  if (parsed.leadId) rows = rows.filter((i) => i.leadId === parsed.leadId);
  if (parsed.customerId) rows = rows.filter((i) => i.customerId === parsed.customerId);
  if (parsed.query) {
    rows = rows.filter((i) => matchQuery(`${i.subject} ${i.message}`, parsed.query));
  }
  return rows.slice(0, parsed.limit ?? CRP_DEFAULT_LIST_LIMIT);
}

/**
 * List customers.
 */
export async function listCustomers(filters: CrpListFilters = {}): Promise<CustomerRecord[]> {
  const parsed = parseCrpListFilters(filters);
  let rows = await repoListCustomers();
  if (parsed.lifecycleStage) {
    rows = rows.filter((c) => c.lifecycleStage === parsed.lifecycleStage);
  }
  if (parsed.query) {
    rows = rows.filter((c) =>
      matchQuery([c.name, c.email, c.phone].filter(Boolean).join(" "), parsed.query)
    );
  }
  return rows.slice(0, parsed.limit ?? CRP_DEFAULT_LIST_LIMIT);
}

/**
 * Get customer by id.
 */
export async function getCustomer(id: string): Promise<CustomerRecord | null> {
  return repoGetCustomer(id);
}

/**
 * Advance customer lifecycle stage (deterministic transition helper).
 */
export async function advanceCustomerLifecycle(
  customerId: string,
  stage: CustomerRecord["lifecycleStage"]
): Promise<CustomerRecord> {
  const customer = await repoGetCustomer(customerId);
  if (!customer) {
    throw new ModuleError(
      "customer-relations",
      "CUSTOMER_NOT_FOUND",
      `Customer not found: ${customerId}`
    );
  }
  const updated = { ...customer, lifecycleStage: stage, updatedAt: new Date().toISOString() };
  await repoUpdateCustomer(updated);
  await recordActivity({
    customerId,
    leadId: null,
    kind: "lifecycle",
    title: "Lifecycle Updated",
    summary: `Stage → ${stage}`,
    occurredAt: updated.updatedAt,
    relatedEntityType: "customer",
    relatedEntityId: customerId,
  });
  return updated;
}

/**
 * Log a communication (email / WhatsApp / phone / chat / note).
 */
export async function logCommunication(
  input: LogCommunicationInput
): Promise<CommunicationRecord> {
  const parsed = parseLogCommunicationInput(input);
  const row = await repoInsertCommunication(parsed);
  await recordActivity({
    customerId: row.customerId,
    leadId: row.leadId,
    kind: "communication",
    title: `${row.channel} ${row.direction}`,
    summary: row.subject ?? row.body.slice(0, 120),
    occurredAt: row.occurredAt,
    relatedEntityType: "communication",
    relatedEntityId: row.id,
  });
  return row;
}

/**
 * List communications.
 */
export async function listCommunications(
  filters: CrpListFilters = {}
): Promise<CommunicationRecord[]> {
  const parsed = parseCrpListFilters(filters);
  let rows = await repoListCommunications();
  if (parsed.customerId) rows = rows.filter((c) => c.customerId === parsed.customerId);
  if (parsed.leadId) rows = rows.filter((c) => c.leadId === parsed.leadId);
  return rows
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, parsed.limit ?? CRP_DEFAULT_LIST_LIMIT);
}

/**
 * Create an assignment.
 */
export async function createAssignment(input: CreateAssignmentInput): Promise<AssignmentRecord> {
  const parsed = parseCreateAssignmentInput(input);
  const row = await repoInsertAssignment(parsed);
  await recordActivity({
    customerId: parsed.entityType === "customer" ? parsed.entityId : null,
    leadId: parsed.entityType === "lead" ? parsed.entityId : null,
    kind: "assignment",
    title: "Lead Assigned",
    summary: `Assigned to ${row.assignedTo} (${row.priority})`,
    occurredAt: row.assignedAt,
    relatedEntityType: "assignment",
    relatedEntityId: row.id,
  });
  return row;
}

/**
 * List assignments.
 */
export async function listAssignments(): Promise<AssignmentRecord[]> {
  return repoListAssignments();
}

/**
 * Schedule a follow-up (scheduler-ready record).
 */
export async function scheduleFollowUp(input: CreateFollowUpInput): Promise<FollowUpRecord> {
  const parsed = parseCreateFollowUpInput(input);
  const row = await repoInsertFollowUp(parsed);
  await recordActivity({
    customerId: row.customerId,
    leadId: row.leadId,
    kind: "followup",
    title: "Follow-up Scheduled",
    summary: row.title,
    occurredAt: row.createdAt,
    relatedEntityType: "followup",
    relatedEntityId: row.id,
  });
  return row;
}

/**
 * Complete or miss a follow-up.
 */
export async function completeFollowUp(
  id: string,
  status: "completed" | "missed" = "completed"
): Promise<FollowUpRecord> {
  const row = await repoUpdateFollowUpStatus(id, status);
  if (!row) {
    throw new ModuleError("customer-relations", "FOLLOWUP_NOT_FOUND", `Follow-up not found: ${id}`);
  }
  await recordActivity({
    customerId: row.customerId,
    leadId: row.leadId,
    kind: "followup",
    title: status === "completed" ? "Follow-up Completed" : "Follow-up Missed",
    summary: row.title,
    occurredAt: new Date().toISOString(),
    relatedEntityType: "followup",
    relatedEntityId: row.id,
  });
  return row;
}

/**
 * List follow-ups.
 */
export async function listFollowUps(filters: CrpListFilters = {}): Promise<FollowUpRecord[]> {
  const parsed = parseCrpListFilters(filters);
  let rows = await repoListFollowUps();
  if (parsed.customerId) rows = rows.filter((f) => f.customerId === parsed.customerId);
  if (parsed.leadId) rows = rows.filter((f) => f.leadId === parsed.leadId);
  return rows.slice(0, parsed.limit ?? CRP_DEFAULT_LIST_LIMIT);
}

/**
 * Add a note (private/public, pin-ready, attachments-ready).
 */
export async function addNote(input: CreateNoteInput): Promise<NoteRecord> {
  const parsed = parseCreateNoteInput(input);
  const row = await repoInsertNote(parsed);
  await recordActivity({
    customerId: row.customerId,
    leadId: row.leadId,
    kind: "note",
    title: row.pinned ? "Pinned Note" : "Note Added",
    summary: row.body.slice(0, 120),
    occurredAt: row.createdAt,
    relatedEntityType: "note",
    relatedEntityId: row.id,
  });
  return row;
}

/**
 * List notes.
 */
export async function listNotes(filters: CrpListFilters = {}): Promise<NoteRecord[]> {
  const parsed = parseCrpListFilters(filters);
  let rows = await repoListNotes();
  if (parsed.customerId) rows = rows.filter((n) => n.customerId === parsed.customerId);
  if (parsed.leadId) rows = rows.filter((n) => n.leadId === parsed.leadId);
  return rows
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, parsed.limit ?? CRP_DEFAULT_LIST_LIMIT);
}

/**
 * Build chronological customer timeline (Admin / Portal / AI / Analytics).
 */
export async function buildCustomerTimeline(opts: {
  customerId?: string;
  leadId?: string;
}): Promise<TimelineItem[]> {
  const [activities, communications, followUps, notes, assignments, leads] = await Promise.all([
    repoListActivities(),
    repoListCommunications(),
    repoListFollowUps(),
    repoListNotes(),
    repoListAssignments(),
    repoListLeads(),
  ]);

  const items: TimelineItem[] = [];

  for (const lead of leads) {
    if (opts.leadId && lead.id !== opts.leadId) continue;
    if (opts.customerId && lead.customerId !== opts.customerId) continue;
    if (!opts.customerId && !opts.leadId) {
      // when no filter, include all lead-created events lightly — skip to avoid noise
      continue;
    }
    items.push({
      id: `lead-created:${lead.id}`,
      occurredAt: lead.createdAt,
      title: "Lead Created",
      summary: `${lead.name} via ${lead.channel}`,
      kind: "lifecycle",
      source: lead.sourceTable,
      metadata: { leadId: lead.id, channel: lead.channel },
    });
  }

  const matches = (customerId: string | null, leadId: string | null) => {
    if (opts.customerId && customerId !== opts.customerId) return false;
    if (opts.leadId && leadId !== opts.leadId) return false;
    if (!opts.customerId && !opts.leadId) return true;
    return Boolean(
      (opts.customerId && customerId === opts.customerId) ||
        (opts.leadId && leadId === opts.leadId)
    );
  };

  for (const a of activities) {
    if (!matches(a.customerId, a.leadId)) continue;
    items.push({
      id: a.id,
      occurredAt: a.occurredAt,
      title: a.title,
      summary: a.summary,
      kind: a.kind,
      source: "activities",
      metadata: {
        relatedEntityType: a.relatedEntityType,
        relatedEntityId: a.relatedEntityId,
      },
    });
  }

  for (const c of communications) {
    if (!matches(c.customerId, c.leadId)) continue;
    items.push({
      id: c.id,
      occurredAt: c.occurredAt,
      title: `${c.channel} ${c.direction}`,
      summary: c.subject ?? c.body.slice(0, 120),
      kind: "communication",
      source: "communication",
      metadata: { channel: c.channel, direction: c.direction },
    });
  }

  for (const f of followUps) {
    if (!matches(f.customerId, f.leadId)) continue;
    items.push({
      id: f.id,
      occurredAt: f.dueAt,
      title: `Follow-up (${f.status})`,
      summary: f.title,
      kind: "followup",
      source: "followups",
      metadata: { status: f.status, recurring: f.recurring },
    });
  }

  for (const n of notes) {
    if (!matches(n.customerId, n.leadId)) continue;
    items.push({
      id: n.id,
      occurredAt: n.createdAt,
      title: n.pinned ? "Pinned Note" : "Note",
      summary: n.body.slice(0, 120),
      kind: "note",
      source: "notes",
      metadata: { visibility: n.visibility, pinned: n.pinned },
    });
  }

  for (const asg of assignments) {
    if (opts.leadId && !(asg.entityType === "lead" && asg.entityId === opts.leadId)) continue;
    if (
      opts.customerId &&
      !(asg.entityType === "customer" && asg.entityId === opts.customerId)
    ) {
      continue;
    }
    items.push({
      id: asg.id,
      occurredAt: asg.assignedAt,
      title: "Assignment",
      summary: `${asg.assignedTo} ← ${asg.assignedBy}`,
      kind: "assignment",
      source: "assignments",
      metadata: { priority: asg.priority, status: asg.status },
    });
  }

  return items.sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
  );
}

/**
 * Renderer contract: customer timeline payload (no UI).
 */
export async function buildTimelineRenderPayload(opts: {
  customerId?: string;
  leadId?: string;
}): Promise<CustomerTimelineRenderPayload> {
  const customer = opts.customerId ? await repoGetCustomer(opts.customerId) : null;
  const lead = opts.leadId ? await repoGetLead(opts.leadId) : null;
  const timeline = await buildCustomerTimeline(opts);
  return {
    customer,
    lead,
    lifecycleStage:
      customer?.lifecycleStage ?? lead?.lifecycleStage ?? "visitor",
    timeline,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Renderer contract: customer profile payload (no UI).
 */
export async function buildCustomerProfileRenderPayload(
  customerId: string
): Promise<CustomerProfileRenderPayload | null> {
  const customer = await repoGetCustomer(customerId);
  if (!customer) return null;
  const [leads, inquiries, followUps, timeline] = await Promise.all([
    listLeads({ customerId }),
    listInquiries({ customerId }),
    listFollowUps({ customerId }),
    buildCustomerTimeline({ customerId }),
  ]);
  return {
    customer,
    leads,
    inquiries,
    openFollowUps: followUps.filter((f) => f.status === "pending" || f.status === "scheduled"),
    timeline,
    generatedAt: new Date().toISOString(),
  };
}
