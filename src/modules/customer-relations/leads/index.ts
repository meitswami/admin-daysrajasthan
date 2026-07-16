export {
  convertLeadToCustomer,
  getLead,
  listLeads,
  qualifyLead,
} from "../service";

export const SUBMODULE = {
  parent: "customer-relations" as const,
  id: "leads" as const,
  description: "Lead aggregation and qualification",
} as const;
