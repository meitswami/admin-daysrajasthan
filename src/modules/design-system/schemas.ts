import { z } from "zod";

export const surfaceIdSchema = z.enum(["website", "admin", "customer", "team", "auth"]);

export const colorTokensSchema = z.object({
  cream: z.string().min(1),
  creamMuted: z.string().min(1),
  maroon: z.string().min(1),
  maroonDeep: z.string().min(1),
  gold: z.string().min(1),
  goldSoft: z.string().min(1),
  ink: z.string().min(1),
  inkMuted: z.string().min(1),
  border: z.string().min(1),
  success: z.string().min(1),
  danger: z.string().min(1),
  white: z.string().min(1),
});

export const animationPresetNameSchema = z.enum([
  "widget-open",
  "card-enter",
  "timeline-reveal",
]);

export const cardVariantNameSchema = z.enum(["heritage", "cream", "gold-edge", "quiet"]);

export const iconNameSchema = z.enum([
  "fort",
  "camel",
  "map-pin",
  "package",
  "chat",
  "whatsapp",
  "share",
  "download",
]);
