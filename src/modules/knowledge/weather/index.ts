/** Knowledge domain: weather — DTO contract only (no queries yet). */
export type { WeatherRecord } from "../types";

export const SUBMODULE = {
  parent: "knowledge" as const,
  id: "weather" as const,
  description: "Weather context",
} as const;
