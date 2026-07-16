import { z } from "zod";

export const quotationStatusSchema = z.enum([
  "draft",
  "generated",
  "sent",
  "viewed",
  "accepted",
  "rejected",
  "expired",
  "cancelled",
]);

export const quotationSourceSchema = z.enum(["manual", "knowledge", "ai_assisted"]);

export const quotationListFiltersSchema = z.object({
  status: quotationStatusSchema.optional(),
  source: quotationSourceSchema.optional(),
  query: z.string().max(200).optional(),
  limit: z.number().int().positive().max(500).optional(),
});

export const createDraftInputSchema = z.object({
  clientName: z.string().min(2).max(200),
  clientEmail: z.string().email().nullable().optional(),
  clientPhone: z.string().min(7).max(30).nullable().optional(),
  title: z.string().max(300).optional(),
  knowledgePackageId: z.string().min(1).nullable().optional(),
  regionCode: z.string().max(32).nullable().optional(),
  source: quotationSourceSchema.optional(),
  createdBy: z.string().max(120).optional(),
});

export const generateFromKnowledgeInputSchema = z.object({
  packageId: z.string().min(1),
  clientName: z.string().min(2).max(200),
  clientEmail: z.string().email().nullable().optional(),
  clientPhone: z.string().min(7).max(30).nullable().optional(),
  adults: z.number().int().positive().max(100).optional(),
  children: z.number().int().min(0).max(100).optional(),
  rooms: z.number().int().positive().max(50).optional(),
  travelDate: z.string().nullable().optional(),
  createdBy: z.string().max(120).optional(),
});

export const transitionInputSchema = z.object({
  quotationId: z.string().min(1),
  toStatus: quotationStatusSchema,
  actor: z.string().max(120).optional(),
  reason: z.string().max(500).optional(),
});

export const createRevisionInputSchema = z.object({
  quotationId: z.string().min(1),
  snapshot: z.custom<Record<string, unknown>>((v) => typeof v === "object" && v !== null),
  createdBy: z.string().min(1).max(120),
  changeSummary: z.string().max(1000).nullable().optional(),
});
