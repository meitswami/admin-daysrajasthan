export { completeFollowUp, listFollowUps, scheduleFollowUp } from "../service";

export const SUBMODULE = {
  parent: "customer-relations" as const,
  id: "followups" as const,
  description: "Follow-up scheduling",
} as const;
