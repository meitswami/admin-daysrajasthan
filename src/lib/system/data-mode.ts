import type { DataMode } from "@/types/system";

const STORAGE_KEY = "td-data-mode-v1";

/**
 * Production is always Real when Supabase env is present.
 * Dummy mode is only for local/dev without a database URL.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http")
  );
}

export function getDataMode(): DataMode {
  if (isSupabaseConfigured()) return "real";
  if (typeof window === "undefined") return "dummy";
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "real" ? "real" : "dummy";
  } catch {
    return "dummy";
  }
}

export function setDataMode(mode: DataMode): void {
  if (typeof window === "undefined") return;
  // Never allow Dummy while Supabase is configured (production).
  const next: DataMode = isSupabaseConfigured() ? "real" : mode;
  localStorage.setItem(STORAGE_KEY, next);
  window.dispatchEvent(new CustomEvent("td-data-mode-change", { detail: next }));
}

export function isRealDataMode(): boolean {
  if (isSupabaseConfigured()) return true;
  return getDataMode() === "real";
}

export async function persistDataModeToServer(mode: DataMode): Promise<boolean> {
  const next: DataMode = isSupabaseConfigured() ? "real" : mode;
  try {
    const res = await fetch("/api/system/data-mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: next }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchDataModeFromServer(): Promise<DataMode | null> {
  try {
    const res = await fetch("/api/system/data-mode");
    if (!res.ok) return isSupabaseConfigured() ? "real" : null;
    const data = (await res.json()) as { mode?: DataMode };
    if (isSupabaseConfigured()) return "real";
    return data.mode ?? null;
  } catch {
    return isSupabaseConfigured() ? "real" : null;
  }
}
