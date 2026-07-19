import type { TeamMember } from "@/types/rbac";
import { HOTEL_CATEGORY_OPTIONS } from "@/types/itinerary-builder";

export type MasterCategory = {
  id: string;
  label: string;
  room_category: string;
  key: string;
  created_at: string;
  created_by_id?: string | null;
  created_by_name?: string | null;
};

const STORAGE_KEY = "td-master-categories-v1";

function seed(): MasterCategory[] {
  const now = new Date().toISOString();
  return HOTEL_CATEGORY_OPTIONS.map((opt) => ({
    id: crypto.randomUUID(),
    label: opt.label,
    room_category: opt.room_category,
    key: opt.key,
    created_at: now,
    created_by_id: "tm-info",
    created_by_name: "Travel Days Admin",
  }));
}

function read(): MasterCategory[] {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as MasterCategory[];
  } catch {
    return seed();
  }
}

function write(items: MasterCategory[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function listMasterCategories(): MasterCategory[] {
  return read();
}

export function createMasterCategory(
  input: { label: string; room_category: string; key: string },
  actor: TeamMember
): MasterCategory {
  const item: MasterCategory = {
    id: crypto.randomUUID(),
    label: input.label.trim(),
    room_category: input.room_category.trim(),
    key: input.key.trim().toLowerCase().replace(/\s+/g, "_"),
    created_at: new Date().toISOString(),
    created_by_id: actor.id,
    created_by_name: actor.name,
  };
  const list = read();
  list.push(item);
  write(list);
  return item;
}

export function updateMasterCategory(
  id: string,
  input: { label: string; room_category: string; key: string }
): MasterCategory | null {
  const list = read();
  const idx = list.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  list[idx] = {
    ...list[idx],
    label: input.label.trim(),
    room_category: input.room_category.trim(),
    key: input.key.trim().toLowerCase().replace(/\s+/g, "_"),
  };
  write(list);
  return list[idx];
}

export function deleteMasterCategory(id: string): boolean {
  const list = read();
  const next = list.filter((i) => i.id !== id);
  if (next.length === list.length) return false;
  write(next);
  return true;
}
