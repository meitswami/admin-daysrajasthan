export { searchCustomers } from "../service";

export const SUBMODULE = {
  parent: "search" as const,
  id: "customer-search" as const,
  description: "Customer discovery via Customer Relationship Platform",
} as const;
