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

/** AI suggestions — Supabase only. No seed insert, no localStorage merge. */
export async function listAiSuggestions(): Promise<AiSuggestion[]> {
  if (!useCloudMaster()) {
    throw new Error(
      "Supabase is not configured. AI suggestions require a live database (no browser storage)."
    );
  }
  return sortByCreatedAsc(await fetchRemote());
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
  const existing = (await fetchRemote()).find((s) => s.id === id);

  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { error } = await supabase.from("td_ai_suggestions").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (existing) {
    logMasterDataChange({
      entityType: "ai_suggestion",
      entityId: id,
      action: "delete",
      summary: `Deleted AI suggestion “${existing.title}”`,
      before: { ...existing },
    });
  }

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
