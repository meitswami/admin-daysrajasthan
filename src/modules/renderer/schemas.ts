import { z } from "zod";

export const renderOutputTypeSchema = z.enum([
  "react",
  "pdf",
  "email",
  "whatsapp",
  "json",
  "native_mobile_future",
]);

export const renderColorModeSchema = z.enum(["light", "dark"]);

export const renderSurfaceSchema = z.enum([
  "website",
  "admin",
  "customer_portal",
  "team_portal",
  "chat",
  "email",
  "pdf",
  "whatsapp",
  "mobile",
]);

export const rendererInputBlockSchema = z.object({
  kind: z.string().min(1),
  title: z.string().nullable(),
  body: z.string().nullable(),
  refs: z.array(
    z.object({
      kind: z.string(),
      id: z.string(),
      title: z.string(),
    })
  ),
  payload: z.record(z.string(), z.unknown()).nullable(),
});

export const rendererInputDocumentSchema = z.object({
  blocks: z.array(rendererInputBlockSchema),
  traceId: z.string().nullable().optional(),
  locale: z.string().nullable().optional(),
  extras: z.record(z.string(), z.unknown()).optional(),
});

export const renderOptionsSchema = z.object({
  outputType: renderOutputTypeSchema,
  surface: renderSurfaceSchema.optional(),
  mode: renderColorModeSchema.optional(),
  reducedMotion: z.boolean().optional(),
  highContrast: z.boolean().optional(),
  locale: z.string().nullable().optional(),
  pageTitle: z.string().nullable().optional(),
});
