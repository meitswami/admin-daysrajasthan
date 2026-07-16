import { ModuleError } from "@/modules/shared";

import { CHAT_MODULE_ID } from "./constants";
import {
  allowedDomainSchema,
  createWebsiteSchema,
  createWidgetKeySchema,
  knowledgeScopeSchema,
  widgetAppearanceSchema,
  widgetBehaviourSchema,
} from "./schemas";

export function parseCreateWebsite(input: unknown) {
  const parsed = createWebsiteSchema.safeParse(input);
  if (!parsed.success) {
    throw new ModuleError(CHAT_MODULE_ID, "INVALID_WEBSITE", "Invalid website", {
      cause: parsed.error.flatten(),
    });
  }
  return parsed.data;
}

export function parseCreateWidgetKey(input: unknown) {
  const parsed = createWidgetKeySchema.safeParse(input);
  if (!parsed.success) {
    throw new ModuleError(CHAT_MODULE_ID, "INVALID_KEY", "Invalid API key input", {
      cause: parsed.error.flatten(),
    });
  }
  return parsed.data;
}

export function parseAppearance(input: unknown) {
  const parsed = widgetAppearanceSchema.safeParse(input);
  if (!parsed.success) {
    throw new ModuleError(CHAT_MODULE_ID, "INVALID_APPEARANCE", "Invalid appearance", {
      cause: parsed.error.flatten(),
    });
  }
  return parsed.data;
}

export function parseBehaviour(input: unknown) {
  const parsed = widgetBehaviourSchema.safeParse(input);
  if (!parsed.success) {
    throw new ModuleError(CHAT_MODULE_ID, "INVALID_BEHAVIOUR", "Invalid behaviour", {
      cause: parsed.error.flatten(),
    });
  }
  return parsed.data;
}

export function parseKnowledgeScope(input: unknown) {
  const parsed = knowledgeScopeSchema.safeParse(input);
  if (!parsed.success) {
    throw new ModuleError(CHAT_MODULE_ID, "INVALID_SCOPE", "Invalid knowledge scope", {
      cause: parsed.error.flatten(),
    });
  }
  return parsed.data;
}

export function parseAllowedDomain(input: unknown) {
  const parsed = allowedDomainSchema.safeParse(input);
  if (!parsed.success) {
    throw new ModuleError(CHAT_MODULE_ID, "INVALID_DOMAIN", "Invalid domain", {
      cause: parsed.error.flatten(),
    });
  }
  return parsed.data;
}
