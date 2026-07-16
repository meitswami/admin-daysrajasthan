import type { DocumentType, GeneratedDocument } from "@/types/itinerary-builder";
import { newUuid } from "./defaults";

const DOCS_KEY = "travel-days-generated-documents";

export function logGeneratedDocument(input: {
  itinerary_id: string;
  revision_id: string;
  quote_id: string;
  version_number: number;
  type: DocumentType;
  created_by?: string;
}): GeneratedDocument {
  const doc: GeneratedDocument = {
    id: newUuid(),
    itinerary_id: input.itinerary_id,
    revision_id: input.revision_id,
    quote_id: input.quote_id,
    type: input.type,
    version_number: input.version_number,
    created_at: new Date().toISOString(),
    created_by: input.created_by ?? "Admin",
  };

  if (typeof window !== "undefined") {
    try {
      const existing = JSON.parse(localStorage.getItem(DOCS_KEY) ?? "[]") as GeneratedDocument[];
      existing.unshift(doc);
      localStorage.setItem(DOCS_KEY, JSON.stringify(existing.slice(0, 100)));
    } catch {
      /* ignore */
    }
  }

  return doc;
}

export function listGeneratedDocuments(itineraryId?: string): GeneratedDocument[] {
  if (typeof window === "undefined") return [];
  try {
    const all = JSON.parse(localStorage.getItem(DOCS_KEY) ?? "[]") as GeneratedDocument[];
    return itineraryId ? all.filter((d) => d.itinerary_id === itineraryId) : all;
  } catch {
    return [];
  }
}
