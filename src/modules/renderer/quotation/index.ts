import { mapQuotation } from "../blocks";
import type { QuotationModel, RendererInputBlock } from "../types";

export function renderQuotation(block: RendererInputBlock): QuotationModel {
  return mapQuotation(block);
}

export const SUBMODULE = {
  parent: "renderer" as const,
  id: "quotation" as const,
  description: "Quotation presentation (never invents prices)",
} as const;
