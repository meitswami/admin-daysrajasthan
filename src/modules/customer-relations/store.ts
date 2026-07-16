/**
 * In-memory CRP extension store for entities without dedicated Travel Days tables yet.
 * Documented in TABLE_OWNERSHIP.md — not a duplicate of existing lead/customer tables.
 */

import { newUuid } from "@/lib/itinerary-builder/defaults";

import type {
  ActivityRecord,
  AssignmentRecord,
  CommunicationRecord,
  CustomerLifecycleStage,
  FollowUpRecord,
  LeadQualificationStatus,
  NoteRecord,
} from "./types";

export type LeadOverride = {
  qualification?: LeadQualificationStatus;
  lifecycleStage?: CustomerLifecycleStage;
  customerId?: string | null;
  quotationId?: string | null;
};

type CrpStore = {
  leadOverrides: Record<string, LeadOverride>;
  customers: Map<string, import("./types").CustomerRecord>;
  communications: CommunicationRecord[];
  assignments: AssignmentRecord[];
  followUps: FollowUpRecord[];
  notes: NoteRecord[];
  activities: ActivityRecord[];
};

const store: CrpStore = {
  leadOverrides: {},
  customers: new Map(),
  communications: [],
  assignments: [],
  followUps: [],
  notes: [],
  activities: [],
};

/** Create a CRP entity id. */
export function crpNewId(): string {
  return newUuid();
}

export function getLeadOverride(leadId: string): LeadOverride {
  return store.leadOverrides[leadId] ?? {};
}

export function setLeadOverride(leadId: string, patch: LeadOverride): void {
  store.leadOverrides[leadId] = { ...store.leadOverrides[leadId], ...patch };
}

export function upsertStoreCustomer(customer: import("./types").CustomerRecord): void {
  store.customers.set(customer.id, customer);
}

export function listStoreCustomers(): import("./types").CustomerRecord[] {
  return [...store.customers.values()];
}

export function getStoreCustomer(id: string): import("./types").CustomerRecord | null {
  return store.customers.get(id) ?? null;
}

export function pushCommunication(row: CommunicationRecord): void {
  store.communications.push(row);
}

export function listCommunications(): CommunicationRecord[] {
  return [...store.communications];
}

export function pushAssignment(row: AssignmentRecord): void {
  store.assignments.push(row);
}

export function listAssignments(): AssignmentRecord[] {
  return [...store.assignments];
}

export function pushFollowUp(row: FollowUpRecord): void {
  store.followUps.push(row);
}

export function listFollowUps(): FollowUpRecord[] {
  return [...store.followUps];
}

export function updateFollowUp(
  id: string,
  patch: Partial<FollowUpRecord>
): FollowUpRecord | null {
  const idx = store.followUps.findIndex((f) => f.id === id);
  if (idx < 0) return null;
  store.followUps[idx] = { ...store.followUps[idx], ...patch };
  return store.followUps[idx];
}

export function pushNote(row: NoteRecord): void {
  store.notes.push(row);
}

export function listNotes(): NoteRecord[] {
  return [...store.notes];
}

export function pushActivity(row: ActivityRecord): void {
  store.activities.push(row);
}

export function listActivities(): ActivityRecord[] {
  return [...store.activities];
}

/** Test helper — reset extension store. */
export function resetCrpStore(): void {
  store.leadOverrides = {};
  store.customers.clear();
  store.communications = [];
  store.assignments = [];
  store.followUps = [];
  store.notes = [];
  store.activities = [];
}
