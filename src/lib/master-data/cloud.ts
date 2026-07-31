import { isSupabaseConfigured } from "@/lib/system/data-mode";

/** Master data / production writes require a live Supabase project. */
export function requireCloudMaster(): void {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Production master data cannot be saved without a live database."
    );
  }
}

/** Prefer cloud whenever Supabase env exists (ignores Dummy toggle). */
export function useCloudMaster(): boolean {
  return isSupabaseConfigured();
}
