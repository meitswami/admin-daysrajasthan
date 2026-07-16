"use client";

import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { PageMain, PageToolbar } from "@/components/ui/data-table";
import { HOTEL_CATEGORY_OPTIONS } from "@/types/itinerary-builder";

export function MasterDataCategoriesView() {
  return (
    <>
      <Header
        title="Categories"
        description="Hotel category tiers used in itinerary pricing"
      />
      <PageMain>
        <PageToolbar>
          <Badge className="h-10 px-3">{HOTEL_CATEGORY_OPTIONS.length} categories</Badge>
        </PageToolbar>
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">S.No.</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Room category</th>
                <th className="px-4 py-3 font-medium">Key</th>
              </tr>
            </thead>
            <tbody>
              {HOTEL_CATEGORY_OPTIONS.map((opt, i) => (
                <tr key={opt.key} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-3 text-stone-500">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-stone-900">{opt.label}</td>
                  <td className="px-4 py-3 text-stone-700">{opt.room_category}</td>
                  <td className="px-4 py-3 font-mono text-xs text-stone-500">{opt.key}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageMain>
    </>
  );
}
