export { addNote, listNotes } from "../service";

export const SUBMODULE = {
  parent: "customer-relations" as const,
  id: "notes" as const,
  description: "Private public pinned notes",
} as const;
