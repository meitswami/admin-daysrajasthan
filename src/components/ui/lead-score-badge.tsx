import { cn } from "@/lib/utils";

const styles = {
  hot: "bg-red-50 text-red-700 ring-red-200",
  warm: "bg-amber-50 text-amber-800 ring-amber-200",
  cold: "bg-stone-100 text-stone-600 ring-stone-200",
};

export function LeadScoreBadge({
  score,
  label,
  className,
}: {
  score: number;
  label: "hot" | "warm" | "cold";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset",
        styles[label],
        className
      )}
      title={`Lead score: ${score}/100`}
    >
      {label} · {score}
    </span>
  );
}
