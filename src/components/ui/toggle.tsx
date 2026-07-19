"use client";

import { cn } from "@/lib/utils";

export function Toggle({
  checked,
  onChange,
  label,
  className,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "inline-flex items-center gap-2",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        className
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-amber-500" : "bg-stone-300"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-5"
          )}
        />
      </button>
      {label && <span className="text-xs font-medium text-stone-600">{label}</span>}
    </label>
  );
}
