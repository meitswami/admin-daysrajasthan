import { isSupabaseConfigured } from "@/lib/system/data-mode";

/** Obsolete browser keys that used to hold master / dummy data. */
const OBSOLETE_MASTER_KEYS = [
  "td-master-policies-v1",
  "td-master-categories-v1",
  "td-master-inclusions-exclusions-v1",
  "td-master-content-v1:destinations",
  "td-master-content-v1:hotels",
  "td-master-content-v1:vehicles",
  "td-master-itineraries-v1",
  "td-master-itineraries-hide-existing-v1",
  "td-company-structure-v2",
  "td_ai_suggestions_v1",
  "td_ai_suggestions_cloud_migrated_v1",
  "td-permission-groups-v1",
] as const;

const PURGED_FLAG = "td-master-local-purged-v2";

/**
 * When Supabase is configured, drop legacy master-data localStorage so the UI
 * cannot mix cached/seeded browser rows with the live database.
 * Always removes Structure key even if an older purge already ran.
 */
export function purgeObsoleteMasterLocalStorage(): void {
  if (typeof window === "undefined" || !isSupabaseConfigured()) return;
  try {
    // Structure must never linger in the browser after cloud mode is on.
    localStorage.removeItem("td-company-structure-v2");
    localStorage.removeItem("td-company-structure-v1");

    if (localStorage.getItem(PURGED_FLAG) === "1") return;
    for (const key of OBSOLETE_MASTER_KEYS) {
      localStorage.removeItem(key);
    }
    localStorage.setItem(PURGED_FLAG, "1");
  } catch {
    // ignore quota / privacy mode
  }
}
