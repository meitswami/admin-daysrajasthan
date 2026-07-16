import type { DataMode } from "@/types/system";

const STORAGE_KEY = "td-data-mode-v1";

export function getDataMode(): DataMode {
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
  localStorage.setItem(STORAGE_KEY, mode);
  window.dispatchEvent(new CustomEvent("td-data-mode-change", { detail: mode }));
}

export function isRealDataMode(): boolean {
  return getDataMode() === "real";
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    typeof process !== "undefined" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http")
  );
}

export async function persistDataModeToServer(mode: DataMode): Promise<boolean> {
  try {
    const res = await fetch("/api/system/data-mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchDataModeFromServer(): Promise<DataMode | null> {
  try {
    const res = await fetch("/api/system/data-mode");
    if (!res.ok) return null;
    const data = (await res.json()) as { mode?: DataMode };
    return data.mode ?? null;
  } catch {
    return null;
  }
}
