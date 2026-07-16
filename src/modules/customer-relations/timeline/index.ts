export {
  buildCustomerTimeline,
  buildTimelineRenderPayload,
} from "../service";

export const SUBMODULE = {
  parent: "customer-relations" as const,
  id: "timeline" as const,
  description: "Chronological customer timeline engine",
} as const;
