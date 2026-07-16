export { listCommunications, logCommunication } from "../service";

export const SUBMODULE = {
  parent: "customer-relations" as const,
  id: "communication" as const,
  description: "Email WhatsApp phone chat SMS notes",
} as const;
