import { z } from "zod";

export const searchMatchModeSchema = z.enum([
  "exact",
  "prefix",
  "contains",
  "keyword",
  "tag",
  "category",
  "region",
  "semantic_future",
]);

export const searchHitKindSchema = z.enum([
  "package",
  "destination",
  "knowledge",
  "customer",
  "lead",
  "quotation",
  "global",
]);

export const travelStyleFilterSchema = z.enum([
  "family",
  "couple",
  "group",
  "luxury",
  "adventure",
  "pilgrimage",
]);

export const searchFiltersSchema = z.object({
  budgetMin: z.number().nonnegative().optional(),
  budgetMax: z.number().nonnegative().optional(),
  durationDaysMin: z.number().int().positive().optional(),
  durationDaysMax: z.number().int().positive().optional(),
  destination: z.string().max(120).optional(),
  regionCode: z.string().max(32).optional(),
  hotelCategory: z.string().max(80).optional(),
  activityType: z.string().max(80).optional(),
  travelStyle: travelStyleFilterSchema.optional(),
  tags: z.array(z.string().max(40)).max(20).optional(),
  category: z.string().max(80).optional(),
  matchMode: searchMatchModeSchema.optional(),
});

export const searchPaginationSchema = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
  cursor: z.string().nullable().optional(),
});

export const searchQuerySchema = z.object({
  text: z.string().max(300),
  filters: searchFiltersSchema.optional(),
  pagination: searchPaginationSchema.optional(),
  limit: z.number().int().positive().max(100).optional(),
  kinds: z.array(searchHitKindSchema).max(10).optional(),
});
