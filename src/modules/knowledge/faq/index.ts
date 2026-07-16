export type { FaqRecord } from "../types";
export { listFaqs } from "../service";

export const SUBMODULE = {
  parent: "knowledge" as const,
  id: "faq" as const,
  description: "FAQ knowledge",
} as const;
