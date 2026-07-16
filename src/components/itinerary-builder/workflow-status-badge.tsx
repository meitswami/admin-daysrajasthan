import { cn } from "@/lib/utils";
import type { WorkflowStatus } from "@/types/itinerary-builder";
import { WORKFLOW_LABELS } from "@/types/itinerary-builder";

const STYLES: Record<WorkflowStatus, string> = {
  draft: "bg-stone-100 text-stone-700 ring-stone-200",
  sales_review: "bg-sky-50 text-sky-800 ring-sky-200",
  manager_approval: "bg-violet-50 text-violet-800 ring-violet-200",
  accounts: "bg-amber-50 text-amber-900 ring-amber-200",
  operations: "bg-orange-50 text-orange-800 ring-orange-200",
  client_shared: "bg-blue-50 text-blue-800 ring-blue-200",
  client_approved: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  booking_confirmed: "bg-green-100 text-green-900 ring-green-200",
  completed: "bg-teal-50 text-teal-800 ring-teal-200",
  archived: "bg-stone-50 text-stone-500 ring-stone-200",
};

export function WorkflowStatusBadge({
  status,
  className,
}: {
  status: WorkflowStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        STYLES[status],
        className
      )}
    >
      {WORKFLOW_LABELS[status]}
    </span>
  );
}
