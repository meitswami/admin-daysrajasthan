export { searchQuotations } from "../service";

export const SUBMODULE = {
  parent: "search" as const,
  id: "quotation-search" as const,
  description: "Quotation discovery via Quotation Engine",
} as const;
