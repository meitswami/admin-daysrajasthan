/**
 * Customer Relationship Platform (CRP) — DTOs only (no raw Supabase rows).
 */

export type CrpId = string;

/** Full commercial lifecycle stage. */
export type CustomerLifecycleStage =
  | "visitor"
  | "lead"
  | "inquiry"
  | "qualified_lead"
  | "quotation"
  | "negotiation"
  | "booking"
  | "payment"
  | "traveler"
  | "completed_tour"
  | "review"
  | "repeat_customer";

export type LeadChannel =
  | "website"
  | "whatsapp"
  | "contact"
  | "email"
  | "chat"
  | "referral"
  | "other";

export type LeadQualificationStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "disqualified"
  | "converted"
  | "closed";

export type LeadRecord = {
  id: CrpId;
  channel: LeadChannel;
  sourceTable: string;
  sourceId: string;
  name: string;
  email: string | null;
  phone: string | null;
  destination: string | null;
  travelDate: string | null;
  adults: number;
  children: number;
  packageHint: string | null;
  notes: string | null;
  qualification: LeadQualificationStatus;
  lifecycleStage: CustomerLifecycleStage;
  customerId: CrpId | null;
  quotationId: string | null;
  createdAt: string;
};

export type InquiryRecord = {
  id: CrpId;
  leadId: CrpId | null;
  customerId: CrpId | null;
  subject: string;
  message: string;
  destination: string | null;
  status: "open" | "in_progress" | "resolved" | "closed";
  createdAt: string;
  resolvedAt: string | null;
};

export type CustomerRecord = {
  id: CrpId;
  name: string;
  email: string | null;
  phone: string | null;
  lifecycleStage: CustomerLifecycleStage;
  leadSource: string | null;
  notes: string | null;
  quotationIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type CommunicationChannel =
  | "email"
  | "whatsapp"
  | "phone"
  | "website_chat"
  | "sms"
  | "internal_note";

export type CommunicationDirection = "inbound" | "outbound" | "internal";

export type CommunicationRecord = {
  id: CrpId;
  customerId: CrpId | null;
  leadId: CrpId | null;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  subject: string | null;
  body: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
  createdBy: string | null;
};

export type AssignmentPriority = "low" | "medium" | "high" | "urgent";
export type AssignmentStatus = "open" | "in_progress" | "done" | "cancelled";

export type AssignmentRecord = {
  id: CrpId;
  entityType: "lead" | "customer" | "inquiry" | "quotation" | "followup";
  entityId: CrpId;
  assignedTo: string;
  assignedBy: string;
  assignedAt: string;
  priority: AssignmentPriority;
  dueDate: string | null;
  status: AssignmentStatus;
  note: string | null;
};

export type FollowUpStatus = "pending" | "completed" | "missed" | "scheduled";

export type FollowUpRecord = {
  id: CrpId;
  customerId: CrpId | null;
  leadId: CrpId | null;
  title: string;
  dueAt: string;
  status: FollowUpStatus;
  recurring: boolean;
  recurrenceRule: string | null;
  completedAt: string | null;
  assignedTo: string | null;
  createdAt: string;
};

export type NoteVisibility = "private" | "public";

export type NoteRecord = {
  id: CrpId;
  customerId: CrpId | null;
  leadId: CrpId | null;
  body: string;
  visibility: NoteVisibility;
  pinned: boolean;
  attachmentIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ActivityKind =
  | "lifecycle"
  | "communication"
  | "quotation"
  | "assignment"
  | "followup"
  | "note"
  | "system";

export type ActivityRecord = {
  id: CrpId;
  customerId: CrpId | null;
  leadId: CrpId | null;
  kind: ActivityKind;
  title: string;
  summary: string;
  occurredAt: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
};

export type TimelineItem = {
  id: CrpId;
  occurredAt: string;
  title: string;
  summary: string;
  kind: ActivityKind | "timeline";
  source: string;
  metadata: Record<string, unknown>;
};

export type CrpListFilters = {
  customerId?: string;
  leadId?: string;
  lifecycleStage?: CustomerLifecycleStage;
  query?: string;
  limit?: number;
};

export type QualifyLeadInput = {
  leadId: string;
  qualification: LeadQualificationStatus;
  actor?: string;
};

export type ConvertLeadInput = {
  leadId: string;
  actor?: string;
};

export type LogCommunicationInput = {
  customerId?: string | null;
  leadId?: string | null;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  subject?: string | null;
  body: string;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
  createdBy?: string | null;
};

export type CreateAssignmentInput = {
  entityType: AssignmentRecord["entityType"];
  entityId: string;
  assignedTo: string;
  assignedBy: string;
  priority?: AssignmentPriority;
  dueDate?: string | null;
  note?: string | null;
};

export type CreateFollowUpInput = {
  customerId?: string | null;
  leadId?: string | null;
  title: string;
  dueAt: string;
  status?: FollowUpStatus;
  recurring?: boolean;
  recurrenceRule?: string | null;
  assignedTo?: string | null;
};

export type CreateNoteInput = {
  customerId?: string | null;
  leadId?: string | null;
  body: string;
  visibility?: NoteVisibility;
  pinned?: boolean;
  createdBy: string;
};

/** Future renderer contract — no UI. */
export type CustomerTimelineRenderPayload = {
  customer: CustomerRecord | null;
  lead: LeadRecord | null;
  lifecycleStage: CustomerLifecycleStage;
  timeline: TimelineItem[];
  generatedAt: string;
};

export type CustomerProfileRenderPayload = {
  customer: CustomerRecord;
  leads: LeadRecord[];
  inquiries: InquiryRecord[];
  openFollowUps: FollowUpRecord[];
  timeline: TimelineItem[];
  generatedAt: string;
};
