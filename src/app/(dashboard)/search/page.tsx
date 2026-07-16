import { Suspense } from "react";
import { SearchView } from "@/components/modules/search-view";

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-6 text-stone-500">Loading search…</div>}>
      <SearchView />
    </Suspense>
  );
}
