export {
  advanceCustomerLifecycle,
  buildCustomerProfileRenderPayload,
  getCustomer,
  listCustomers,
} from "../service";

export const SUBMODULE = {
  parent: "customer-relations" as const,
  id: "customers" as const,
  description: "Customer profiles and lifecycle",
} as const;
