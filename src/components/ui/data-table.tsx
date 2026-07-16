"use client";

import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
};

export function DataTable<T extends { id: string }>({
  columns,
  data,
  mobileCard,
}: {
  columns: Column<T>[];
  data: T[];
  mobileCard?: (row: T) => React.ReactNode;
}) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 px-6 py-12 text-center text-sm text-stone-500">
        No records found
      </div>
    );
  }

  return (
    <>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/80">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500",
                      col.className
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {data.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-amber-50/30">
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-4 py-3 text-stone-700", col.className)}>
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {data.map((row) => (
          <div
            key={row.id}
            className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            {mobileCard ? mobileCard(row) : (
              <div className="space-y-2">
                {columns.filter((c) => !c.hideOnMobile).map((col) => (
                  <div key={col.key} className="flex justify-between gap-2 text-sm">
                    <span className="text-stone-500">{col.header}</span>
                    <span className="text-right font-medium text-stone-800">{col.cell(row)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

export function PageToolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between", className)}>
      {children}
    </div>
  );
}

export function PageMain({ children, className }: { children: React.ReactNode; className?: string }) {
  return <main className={cn("flex-1 space-y-4 p-4 sm:space-y-6 sm:p-6", className)}>{children}</main>;
}
