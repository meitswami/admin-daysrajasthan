import { z } from "zod";

export const apiVersionSchema = z.enum(["v1", "v2"]);

export const authModeSchema = z.enum(["anonymous", "session", "service"]);

export const gatewayRouteIdSchema = z
  .string()
  .min(3)
  .max(120)
  .regex(/^[a-z0-9]+([._-][a-z0-9]+)*$/i);
