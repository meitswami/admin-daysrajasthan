import type { ItinerarySnapshot } from "@/types/itinerary-builder";
import { normalizeSnapshot } from "@/lib/itinerary-builder/normalize";

const STORAGE_KEY = "tdr.wizard-unsaved-draft.v1";
const DRAFT_PREVIEW_ID_KEY = "tdr.wizard-draft-preview-id.v1";

export type WizardDraftPayload = {
  snapshot: ItinerarySnapshot;
  packageId: string | null;
  updatedAt: string;
};

export function loadWizardDraft(): WizardDraftPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WizardDraftPayload;
    if (!parsed?.snapshot) return null;
    return {
      snapshot: normalizeSnapshot(parsed.snapshot),
      packageId: parsed.packageId ?? null,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveWizardDraft(input: {
  snapshot: ItinerarySnapshot;
  packageId?: string | null;
}): void {
  if (typeof window === "undefined") return;
  const payload: WizardDraftPayload = {
    snapshot: normalizeSnapshot(input.snapshot),
    packageId: input.packageId ?? input.snapshot.source_package_id ?? null,
    updatedAt: new Date().toISOString(),
  };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota / private mode — preview still works in-memory for this tab hop only if set fails
  }
}

export function clearWizardDraft(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(DRAFT_PREVIEW_ID_KEY);
  } catch {
    // ignore
  }
}

/** Stable temp id for Preview-without-Save (not a list / QRT allotment). */
export function getOrCreateDraftPreviewId(): string {
  if (typeof window === "undefined") return crypto.randomUUID();
  try {
    const existing = sessionStorage.getItem(DRAFT_PREVIEW_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(DRAFT_PREVIEW_ID_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}
