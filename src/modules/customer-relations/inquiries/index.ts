export { listInquiries } from "../service";

export const SUBMODULE = {
  parent: "customer-relations" as const,
  id: "inquiries" as const,
  description: "Inquiry records",
} as const;
