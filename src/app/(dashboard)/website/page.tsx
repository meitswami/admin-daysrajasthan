import { Suspense } from "react";
import { WebsiteContentView } from "@/components/modules/website-content-view";

export default function WebsitePage() {
  return (
    <Suspense fallback={<div className="p-6 text-stone-500">Loading…</div>}>
      <WebsiteContentView />
    </Suspense>
  );
}
