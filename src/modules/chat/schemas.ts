import { z } from "zod";

export const chatAiModeSchema = z.enum(["offline", "ai", "disabled"]);

export const widgetAppearanceSchema = z.object({
  primaryColor: z.string().min(4),
  accentColor: z.string().min(4),
  launcherLabel: z.string().min(1).max(40),
  launcherIcon: z.enum(["chat", "message", "sparkles"]),
  borderRadiusPx: z.number().int().min(0).max(32),
  colorMode: z.enum(["light", "dark", "system"]),
  showBranding: z.boolean(),
  welcomeTitle: z.string().min(1).max(80),
  welcomeBody: z.string().min(1).max(400),
});

export const widgetBehaviourSchema = z.object({
  autoOpen: z.boolean(),
  autoOpenDelayMs: z.number().int().min(0).max(60_000),
  greetOnFirstVisit: z.boolean(),
  collectEmail: z.boolean(),
  collectPhone: z.boolean(),
  offlineMessage: z.string().min(1).max(400),
  businessHoursNote: z.string().max(200),
  enableFileUpload: z.boolean(),
  enableTypingIndicator: z.boolean(),
});

export const knowledgeScopeSchema = z.object({
  includePackages: z.boolean(),
  includeDestinations: z.boolean(),
  includeFaqs: z.boolean(),
  includeBlogs: z.boolean(),
  regionCodes: z.array(z.string()),
  notes: z.string().max(500),
});

export const createWebsiteSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
});

export const createWidgetKeySchema = z.object({
  websiteId: z.string().min(1),
  label: z.string().min(1).max(60),
});

export const allowedDomainSchema = z.object({
  websiteId: z.string().min(1),
  origin: z.string().min(4),
  enabled: z.boolean().optional(),
});

export const embedFormatSchema = z.enum([
  "script",
  "react",
  "nextjs",
  "iframe",
  "api_endpoint",
]);

export const chatRequestSchema = z.object({
  key: z.string().min(1),
  message: z.string().min(1).max(4000),
  sessionId: z.string().nullable().optional(),
  name: z.string().max(80).optional(),
  email: z.string().max(120).optional(),
});
