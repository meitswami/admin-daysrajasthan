import { ModuleError } from "@/modules/shared";

import {
  animationPresetNameSchema,
  cardVariantNameSchema,
  iconNameSchema,
  surfaceIdSchema,
} from "./schemas";
import type {
  AnimationPresetName,
  CardVariantName,
  IconName,
  SurfaceId,
} from "./types";

export function parseSurfaceId(value: unknown): SurfaceId {
  const result = surfaceIdSchema.safeParse(value);
  if (!result.success) {
    throw new ModuleError(
      "design-system",
      "INVALID_SURFACE",
      `Invalid surface id: ${String(value)}`
    );
  }
  return result.data;
}

export function parseAnimationPresetName(value: unknown): AnimationPresetName {
  const result = animationPresetNameSchema.safeParse(value);
  if (!result.success) {
    throw new ModuleError(
      "design-system",
      "INVALID_ANIMATION",
      `Invalid animation preset: ${String(value)}`
    );
  }
  return result.data;
}

export function parseCardVariantName(value: unknown): CardVariantName {
  const result = cardVariantNameSchema.safeParse(value);
  if (!result.success) {
    throw new ModuleError(
      "design-system",
      "INVALID_CARD_VARIANT",
      `Invalid card variant: ${String(value)}`
    );
  }
  return result.data;
}

export function parseIconName(value: unknown): IconName {
  const result = iconNameSchema.safeParse(value);
  if (!result.success) {
    throw new ModuleError(
      "design-system",
      "INVALID_ICON",
      `Invalid icon name: ${String(value)}`
    );
  }
  return result.data;
}
