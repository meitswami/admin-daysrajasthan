import { requireCloudMaster, useCloudMaster } from "@/lib/master-data/cloud";
import { logMasterDataChange } from "@/lib/master-data/audit";

export type AiSuggestion = {
  id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  source: "seed" | "learned" | "manual";
  created_by_id?: string | null;
  created_by_name?: string | null;
};

const STORAGE_KEY = "td_ai_suggestions_v1";
const MIGRATED_FLAG = "td_ai_suggestions_cloud_migrated_v1";

const SEED: Omit<AiSuggestion, "id" | "created_at" | "updated_at" | "source">[] = [
  {
    title: "Arrival At Jaipur",
    description:
      "You are received at Airport/Railway Station/Hotel and transferred to Hotel. By the evening we visit the modern attractions of the pink city, which includes the Statue Circle, Birla Auditorium & Planetarium, New Vidhan Sabha, Birla Mandir and Jawahar Kala Kendra. Overnight at Jaipur.",
  },
  {
    title: "Jaipur Sightseeing",
    description:
      "After breakfast we drive out to explore the well planned city of Sawai Jai Singh II still alive with culture. Visit City Palace, Hawa Mahal, Amber Fort and Jal Mahal. Overnight at Jaipur.",
  },
  {
    title: "Departure From Jaipur",
    description:
      "After breakfast you will be transferred to Airport / Railway station to connect your onwards journey. (The Tour Ends)",
  },
  {
    title: "Arrival At Udaipur",
    description:
      "On arrival at Udaipur you are received and transferred to hotel. Evening boat ride on Lake Pichola (subject to water level). Overnight at Udaipur.",
  },
  {
    title: "Udaipur Sightseeing",
    description:
      "After breakfast visit City Palace, Jagdish Temple, Saheliyon Ki Bari and Bagore Ki Haveli. Overnight at Udaipur.",
  },
  {
    title: "Departure From Udaipur",
    description:
      "After breakfast transfer to Airport / Railway station for onwards journey. (The Tour Ends)",
  },
  {
    title: "Arrival At Jodhpur",
    description:
      "On arrival at Jodhpur you are received and transferred to hotel. Evening free to explore the blue city markets. Overnight at Jodhpur.",
  },
  {
    title: "Jodhpur Sightseeing",
    description:
      "After breakfast proceed to Jodhpur. Upon arrival check in at hotel. Soon after we climb up the Majestic Mehrangarh Fort and visit Jaswant Thada. Overnight at Jodhpur.",
  },
  {
    title: "Departure From Jodhpur",
    description:
      "You will be transferred to Jodhpur Airport / Railway station to connect your onwards journey. (The Tour Ends)",
  },
  {
    title: "Arrival At Jaisalmer",
    description:
      "On arrival at Jaisalmer transfer to hotel. Evening visit to Gadisar Lake. Overnight at Jaisalmer.",
  },
  {
    title: "Jaisalmer Sightseeing With Desert Stay",
    description:
      "Visit Jaisalmer Fort, Patwon Ki Haveli and proceed to desert camp for camel ride, bonfire and cultural program. Overnight at desert camp / hotel.",
  },
  {
    title: "Departure From Jaisalmer",
    description:
      "After breakfast transfer to Airport / Railway station for onwards journey.",
  },
  {
    title: "Jodhpur - Mount Abu:",
    description:
      "After breakfast drive to Mount Abu. On arrival check in at hotel. Evening Nakki Lake. Overnight at Mount Abu.",
  },
  {
    title: "Jodhpur - Jaisalmer",
    description:
      "After breakfast drive to Jaisalmer. On arrival check in at hotel. Overnight at Jaisalmer.",
  },
  {
    title: "Udaipur - Jodhpur",
    description:
      "After breakfast drive to Jodhpur. On arrival check in at hotel. Overnight at Jodhpur.",
  },
  {
    title: "Jaipur - Jodhpur",
    description:
      "After breakfast drive to Jodhpur. On arrival check in at hotel. Overnight at Jodhpur.",
  },
];

function now() {
  return new Date().toISOString();
}

function uid() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `sug-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mapRow(row: Record<string, unknown>): AiSuggestion {
  const sourceRaw = String(row.source ?? "manual");
  const source: AiSuggestion["source"] =
    sourceRaw === "seed" || sourceRaw === "learned" || sourceRaw === "manual"
      ? sourceRaw
      : "manual";
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    created_at: String(row.created_at ?? now()),
    updated_at: String(row.updated_at ?? row.created_at ?? now()),
    source,
    created_by_id: (row.created_by as string | null) ?? null,
    created_by_name: (row.created_by_name as string | null) ?? null,
  };
}

function toRow(item: AiSuggestion) {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    source: item.source,
    created_at: item.created_at,
    updated_at: item.updated_at,
    created_by: item.created_by_id,
    created_by_name: item.created_by_name,
  };
}

function seedList(): AiSuggestion[] {
  const t = now();
  return SEED.map((s) => ({
    ...s,
    id: uid(),
    created_at: t,
    updated_at: t,
    source: "seed" as const,
    created_by_id: "tm-info",
    created_by_name: "Travel Days Admin",
  }));
}

/** Read browser cache without inventing seed data. */
function readLocalRaw(): AiSuggestion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AiSuggestion[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalCache(list: AiSuggestion[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

async function fetchRemote(): Promise<AiSuggestion[]> {
  requireCloudMaster();
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { data, error } = await supabase
    .from("td_ai_suggestions")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

function sortByCreatedAsc(list: AiSuggestion[]): AiSuggestion[] {
  return [...list].sort((a, b) => {
    const byTime = a.created_at.localeCompare(b.created_at);
    if (byTime !== 0) return byTime;
    return a.id.localeCompare(b.id);
  });
}

function hasMigratedLocal(): boolean {
  if (typeof window === "undefined") return true;
  return Boolean(localStorage.getItem(MIGRATED_FLAG));
}

function markMigratedLocal() {
  if (typeof window !== "undefined") {
    localStorage.setItem(MIGRATED_FLAG, new Date().toISOString());
  }
}

/**
 * One-time recovery: upload browser-local suggestions missing from Supabase.
 * Must not run on every list — that resurrects intentionally deleted rows.
 */
async function uploadMissingLocal(remote: AiSuggestion[]): Promise<AiSuggestion[]> {
  const local = readLocalRaw();
  if (!local.length) {
    markMigratedLocal();
    return remote;
  }

  const remoteIds = new Set(remote.map((r) => r.id));
  const missing = local.filter((l) => l.title.trim() && !remoteIds.has(l.id));
  if (!missing.length) {
    markMigratedLocal();
    return remote;
  }

  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const chunkSize = 50;
  for (let i = 0; i < missing.length; i += chunkSize) {
    const chunk = missing.slice(i, i + chunkSize).map(toRow);
    const { error } = await supabase.from("td_ai_suggestions").upsert(chunk, { onConflict: "id" });
    if (error) throw new Error(`Failed to migrate AI suggestions to cloud: ${error.message}`);
  }

  markMigratedLocal();
  return fetchRemote();
}

export async function listAiSuggestions(): Promise<AiSuggestion[]> {
  if (!useCloudMaster()) {
    // Dev without Supabase only — never invent production data paths here.
    const local = readLocalRaw();
    return sortByCreatedAsc(local.length ? local : seedList());
  }

  let remote = await fetchRemote();

  if (!hasMigratedLocal()) {
    if (remote.length === 0) {
      const local = readLocalRaw();
      if (local.length > 0) {
        // One-time recovery when cloud is empty and browser still has local data.
        remote = await uploadMissingLocal([]);
      } else {
        const seeded = seedList();
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { error } = await supabase.from("td_ai_suggestions").insert(seeded.map(toRow));
        if (error) throw new Error(error.message);
        markMigratedLocal();
        remote = seeded;
      }
    } else {
      // Cloud already has data — never re-upload local orphans (that resurrects deletes).
      markMigratedLocal();
    }
  }

  // Cloud is source of truth — overwrite local so deletes stay deleted.
  const sorted = sortByCreatedAsc(remote);
  writeLocalCache(sorted);
  return sorted;
}

export async function searchAiSuggestions(query: string): Promise<AiSuggestion[]> {
  const q = query.trim().toLowerCase();
  const all = await listAiSuggestions();
  if (!q) return [...all].reverse().slice(0, 20);
  return all.filter(
    (s) =>
      s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
  );
}

export async function createAiSuggestion(input: {
  title: string;
  description: string;
  source?: AiSuggestion["source"];
  created_by_id?: string | null;
  created_by_name?: string | null;
}): Promise<AiSuggestion> {
  requireCloudMaster();
  const t = now();
  const item: AiSuggestion = {
    id: uid(),
    title: input.title.trim(),
    description: input.description.trim(),
    created_at: t,
    updated_at: t,
    source: input.source ?? "manual",
    created_by_id: input.created_by_id ?? null,
    created_by_name: input.created_by_name ?? null,
  };

  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { error } = await supabase.from("td_ai_suggestions").insert(toRow(item));
  if (error) throw new Error(error.message);

  const cache = readLocalRaw().filter((s) => s.id !== item.id);
  cache.push(item);
  writeLocalCache(sortByCreatedAsc(cache));

  if (item.source === "manual") {
    logMasterDataChange({
      entityType: "ai_suggestion",
      entityId: item.id,
      action: "create",
      summary: `Created AI suggestion “${item.title}”`,
      after: { ...item },
    });
  }

  return item;
}

export async function updateAiSuggestion(
  id: string,
  input: { title: string; description: string }
): Promise<AiSuggestion | null> {
  requireCloudMaster();
  const list = await listAiSuggestions();
  const existing = list.find((s) => s.id === id);
  if (!existing) return null;
  const next: AiSuggestion = {
    ...existing,
    title: input.title.trim(),
    description: input.description.trim(),
    updated_at: now(),
  };

  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { error } = await supabase
    .from("td_ai_suggestions")
    .update({
      title: next.title,
      description: next.description,
      updated_at: next.updated_at,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  const cache = readLocalRaw();
  const idx = cache.findIndex((s) => s.id === id);
  if (idx >= 0) {
    cache[idx] = next;
    writeLocalCache(cache);
  }

  logMasterDataChange({
    entityType: "ai_suggestion",
    entityId: id,
    action: "update",
    summary: `Updated AI suggestion “${next.title}”`,
    before: { ...existing },
    after: { ...next },
  });

  return next;
}

export async function deleteAiSuggestion(id: string): Promise<boolean> {
  requireCloudMaster();
  const cached = readLocalRaw().find((s) => s.id === id);
  const existing = cached ?? (await fetchRemote()).find((s) => s.id === id);
  if (!existing) {
    // Still try cloud delete + local purge in case cache is stale.
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { error } = await supabase.from("td_ai_suggestions").delete().eq("id", id);
    if (error) throw new Error(error.message);
    writeLocalCache(readLocalRaw().filter((s) => s.id !== id));
    return true;
  }

  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { error } = await supabase.from("td_ai_suggestions").delete().eq("id", id);
  if (error) throw new Error(error.message);

  writeLocalCache(readLocalRaw().filter((s) => s.id !== id));
  markMigratedLocal();

  logMasterDataChange({
    entityType: "ai_suggestion",
    entityId: id,
    action: "delete",
    summary: `Deleted AI suggestion “${existing.title}”`,
    before: { ...existing },
  });

  return true;
}

/** Learn from custom day title/description so suggestions stay fresh */
export async function learnAiSuggestionFromDay(title: string, description: string) {
  const t = title.trim();
  const d = description.trim();
  if (!t || t.length < 3) return;
  try {
    const list = await listAiSuggestions();
    const existing = list.find((s) => s.title.toLowerCase() === t.toLowerCase());
    if (existing) {
      if (d && d !== existing.description) {
        await updateAiSuggestion(existing.id, { title: existing.title, description: d });
      }
      return;
    }
    await createAiSuggestion({ title: t, description: d || t, source: "learned" });
  } catch (err) {
    console.warn("[ai-suggestions] learn failed", err);
  }
}
