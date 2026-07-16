import { getModuleManifest } from "@/modules/shared";

export const moduleManifest = getModuleManifest("customer-relations");

export type {
  ActivityKind,
  ActivityRecord,
  AssignmentPriority,
  AssignmentRecord,
  AssignmentStatus,
  CommunicationChannel,
  CommunicationDirection,
  CommunicationRecord,
  ConvertLeadInput,
  CreateAssignmentInput,
  CreateFollowUpInput,
  CreateNoteInput,
  CrpId,
  CrpListFilters,
  CustomerLifecycleStage,
  CustomerProfileRenderPayload,
  CustomerRecord,
  CustomerTimelineRenderPayload,
  FollowUpRecord,
  FollowUpStatus,
  InquiryRecord,
  LeadChannel,
  LeadQualificationStatus,
  LeadRecord,
  LogCommunicationInput,
  NoteRecord,
  NoteVisibility,
  QualifyLeadInput,
  TimelineItem,
} from "./types";

export {
  CRP_CACHE_PREFIX,
  CRP_DEFAULT_LIST_LIMIT,
  CUSTOMER_LIFECYCLE_STAGES,
  QUALIFICATION_TO_LIFECYCLE,
} from "./constants";

export {
  convertLeadInputSchema,
  createAssignmentInputSchema,
  createFollowUpInputSchema,
  createNoteInputSchema,
  crpListFiltersSchema,
  leadQualificationSchema,
  lifecycleStageSchema,
  logCommunicationInputSchema,
  qualifyLeadInputSchema,
} from "./schemas";

export {
  parseConvertLeadInput,
  parseCreateAssignmentInput,
  parseCreateFollowUpInput,
  parseCreateNoteInput,
  parseCrpListFilters,
  parseLogCommunicationInput,
  parseQualifyLeadInput,
} from "./validators";

export {
  getCrpCache,
  PassthroughCrpCache,
  setCrpCache,
  withCrpCache,
  type CrpCache,
} from "./cache";

export {
  CRP_EVENT_DEFINITIONS,
  getCrpEventDefinition,
  listCrpEventDefinitions,
  type CrpEventDefinition,
  type CrpEventType,
} from "./events";

export {
  addNote,
  advanceCustomerLifecycle,
  buildCustomerProfileRenderPayload,
  buildCustomerTimeline,
  buildTimelineRenderPayload,
  completeFollowUp,
  convertLeadToCustomer,
  createAssignment,
  getCustomer,
  getLead,
  listAssignments,
  listCommunications,
  listCustomers,
  listFollowUps,
  listInquiries,
  listLeads,
  listNotes,
  logCommunication,
  qualifyLead,
  scheduleFollowUp,
} from "./service";

export { SUBMODULE as timeline } from "./timeline";
export { SUBMODULE as leads } from "./leads";
export { SUBMODULE as inquiries } from "./inquiries";
export { SUBMODULE as customers } from "./customers";
export { SUBMODULE as communication } from "./communication";
export { SUBMODULE as followups } from "./followups";
export { SUBMODULE as assignments } from "./assignments";
export { SUBMODULE as notes } from "./notes";
export { SUBMODULE as activities } from "./activities";
