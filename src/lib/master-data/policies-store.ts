import type { TeamMember } from "@/types/rbac";
import {
  MASTER_CANCELLATION,
  MASTER_PAYMENT,
  MASTER_TERMS,
} from "@/lib/itinerary-builder/policy-master";

export type PolicySectionKey = "terms" | "cancellation" | "payment";

export type MasterPolicyLine = {
  id: string;
  section: PolicySectionKey;
  title: string;
  created_at: string;
  created_by_id?: string | null;
  created_by_name?: string | null;
};

const STORAGE_KEY = "td-master-policies-v1";

function seed(): MasterPolicyLine[] {
  const now = new Date().toISOString();
  const map = (
    section: PolicySectionKey,
    lines: { id: string; title: string }[]
  ): MasterPolicyLine[] =>
    lines.map((l) => ({
      id: crypto.randomUUID(),
      section,
      title: l.title,
      created_at: now,
      created_by_id: "tm-info",
      created_by_name: "Travel Days Admin",
    }));
  return [
    ...map("terms", MASTER_TERMS),
    ...map("cancellation", MASTER_CANCELLATION),
    ...map("payment", MASTER_PAYMENT),
  ];
}

function read(): MasterPolicyLine[] {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as MasterPolicyLine[];
  } catch {
    return seed();
  }
}

function write(items: MasterPolicyLine[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function listMasterPolicies(): MasterPolicyLine[] {
  return read();
}

export function createMasterPolicy(
  section: PolicySectionKey,
  title: string,
  actor: TeamMember
): MasterPolicyLine {
  const item: MasterPolicyLine = {
    id: crypto.randomUUID(),
    section,
    title: title.trim(),
    created_at: new Date().toISOString(),
    created_by_id: actor.id,
    created_by_name: actor.name,
  };
  const list = read();
  list.push(item);
  write(list);
  return item;
}

export function updateMasterPolicy(id: string, title: string): MasterPolicyLine | null {
  const list = read();
  const idx = list.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], title: title.trim() };
  write(list);
  return list[idx];
}

export function deleteMasterPolicy(id: string): boolean {
  const list = read();
  const next = list.filter((i) => i.id !== id);
  if (next.length === list.length) return false;
  write(next);
  return true;
}
