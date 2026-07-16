import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  open: "bg-amber-50 text-amber-800 ring-amber-200",
  resolved: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  new: "bg-sky-50 text-sky-800 ring-sky-200",
  contacted: "bg-violet-50 text-violet-800 ring-violet-200",
  quoted: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  converted: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  closed: "bg-stone-100 text-stone-600 ring-stone-200",
  active: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  inactive: "bg-stone-100 text-stone-600 ring-stone-200",
  published: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  draft: "bg-stone-100 text-stone-600 ring-stone-200",
  synced: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  failed: "bg-red-50 text-red-700 ring-red-200",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const key = status.toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset",
        styles[key] ?? "bg-stone-100 text-stone-700 ring-stone-200",
        className
      )}
    >
      {status}
    </span>
  );
}
