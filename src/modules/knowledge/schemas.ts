import { z } from "zod";

export const regionCodeSchema = z.string().min(1).max(32);

export const knowledgeListFiltersSchema = z.object({
  regionCode: regionCodeSchema.optional(),
  showOnWebsiteOnly: z.boolean().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  trendingOnly: z.boolean().optional(),
  query: z.string().max(200).optional(),
  limit: z.number().int().positive().max(500).optional(),
});

export const knowledgeIdSchema = z.string().uuid().or(z.string().min(1));

export const knowledgeSlugSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, "Invalid slug");

export const packageStatusSchema = z.enum(["active", "inactive"]);
