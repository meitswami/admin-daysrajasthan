import { z } from "zod";

export const lifecycleStageSchema = z.enum([
  "visitor",
  "lead",
  "inquiry",
  "qualified_lead",
  "quotation",
  "negotiation",
  "booking",
  "payment",
  "traveler",
  "completed_tour",
  "review",
  "repeat_customer",
]);

export const leadQualificationSchema = z.enum([
  "new",
  "contacted",
  "qualified",
  "disqualified",
  "converted",
  "closed",
]);

export const crpListFiltersSchema = z.object({
  customerId: z.string().min(1).optional(),
  leadId: z.string().min(1).optional(),
  lifecycleStage: lifecycleStageSchema.optional(),
  query: z.string().max(200).optional(),
  limit: z.number().int().positive().max(500).optional(),
});

export const qualifyLeadInputSchema = z.object({
  leadId: z.string().min(1),
  qualification: leadQualificationSchema,
  actor: z.string().max(120).optional(),
});

export const convertLeadInputSchema = z.object({
  leadId: z.string().min(1),
  actor: z.string().max(120).optional(),
});

export const logCommunicationInputSchema = z.object({
  customerId: z.string().min(1).nullable().optional(),
  leadId: z.string().min(1).nullable().optional(),
  channel: z.enum(["email", "whatsapp", "phone", "website_chat", "sms", "internal_note"]),
  direction: z.enum(["inbound", "outbound", "internal"]),
  subject: z.string().max(300).nullable().optional(),
  body: z.string().min(1).max(20000),
  metadata: z.record(z.string(), z.unknown()).optional(),
  occurredAt: z.string().optional(),
  createdBy: z.string().max(120).nullable().optional(),
});

export const createAssignmentInputSchema = z.object({
  entityType: z.enum(["lead", "customer", "inquiry", "quotation", "followup"]),
  entityId: z.string().min(1),
  assignedTo: z.string().min(1).max(120),
  assignedBy: z.string().min(1).max(120),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueDate: z.string().nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
});

export const createFollowUpInputSchema = z.object({
  customerId: z.string().min(1).nullable().optional(),
  leadId: z.string().min(1).nullable().optional(),
  title: z.string().min(1).max(300),
  dueAt: z.string().min(1),
  status: z.enum(["pending", "completed", "missed", "scheduled"]).optional(),
  recurring: z.boolean().optional(),
  recurrenceRule: z.string().max(200).nullable().optional(),
  assignedTo: z.string().max(120).nullable().optional(),
});

export const createNoteInputSchema = z.object({
  customerId: z.string().min(1).nullable().optional(),
  leadId: z.string().min(1).nullable().optional(),
  body: z.string().min(1).max(20000),
  visibility: z.enum(["private", "public"]).optional(),
  pinned: z.boolean().optional(),
  createdBy: z.string().min(1).max(120),
});
